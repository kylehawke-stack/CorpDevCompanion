import type { Context } from "@netlify/functions";

interface RequestBody {
  symbol: string;
  sector?: string;
  industry?: string;
}

interface PeerCompany {
  symbol: string;
  name: string;
  marketCap: number;
  industry: string;
  logo: string;
}

interface SicResult {
  symbol: string | null;
  name: string;
  sicCode: string;
  industryTitle: string;
}

export default async function handler(req: Request, _context: Context) {
  const fmpKey = process.env.FMP_API_KEY;
  if (!fmpKey) {
    return new Response(JSON.stringify({ error: "FMP API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body: RequestBody = await req.json();
  const { symbol, sector: targetSector, industry: targetIndustry } = body;

  if (!symbol) {
    return new Response(JSON.stringify({ error: "Missing symbol" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // === Step 1: Get target's SIC code ===
    let targetSic = "";
    let targetSicGroup = ""; // first 3 digits for adjacent matching
    try {
      const sicRes = await fetch(
        `https://financialmodelingprep.com/stable/industry-classification-search?symbol=${encodeURIComponent(symbol)}&apikey=${fmpKey}`
      );
      if (sicRes.ok) {
        const sicData: SicResult[] = await sicRes.json();
        if (Array.isArray(sicData) && sicData.length > 0) {
          targetSic = sicData[0].sicCode;
          targetSicGroup = targetSic.slice(0, 3);
        }
      }
    } catch { /* ignore */ }

    // === Step 2: Find companies by SIC code (exact match) ===
    const sicSymbols = new Map<string, number>(); // symbol → relevance score
    if (targetSic) {
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/stable/industry-classification-search?sicCode=${encodeURIComponent(targetSic)}&apikey=${fmpKey}`
        );
        if (res.ok) {
          const data: SicResult[] = await res.json();
          for (const item of data) {
            if (item.symbol && item.symbol !== symbol) {
              sicSymbols.set(item.symbol, 4); // exact SIC = highest relevance
            }
          }
        }
      } catch { /* ignore */ }
    }

    // === Step 3: Find companies by adjacent SIC codes (same 3-digit group) ===
    if (targetSicGroup) {
      const adjacentCodes = [];
      const base = parseInt(targetSicGroup) * 10;
      for (let i = 0; i < 10; i++) {
        const code = String(base + i);
        if (code !== targetSic) adjacentCodes.push(code);
      }

      // Fetch up to 5 adjacent SIC codes in parallel
      const adjacentRequests = adjacentCodes.slice(0, 5).map(async (sic) => {
        try {
          const res = await fetch(
            `https://financialmodelingprep.com/stable/industry-classification-search?sicCode=${encodeURIComponent(sic)}&apikey=${fmpKey}`
          );
          if (!res.ok) return;
          const data: SicResult[] = await res.json();
          for (const item of data) {
            if (item.symbol && item.symbol !== symbol && !sicSymbols.has(item.symbol)) {
              sicSymbols.set(item.symbol, 3); // adjacent SIC
            }
          }
        } catch { /* ignore */ }
      });
      await Promise.allSettled(adjacentRequests);
    }

    // === Step 4: Also fetch FMP stock peers (market-cap-based) ===
    const peerSymbols = new Set<string>();
    try {
      const peersRes = await fetch(
        `https://financialmodelingprep.com/stable/stock-peers?symbol=${encodeURIComponent(symbol)}&apikey=${fmpKey}`
      );
      if (peersRes.ok) {
        const peersData = await peersRes.json();
        if (Array.isArray(peersData)) {
          for (const p of peersData) {
            if (p.symbol && p.symbol !== symbol) peerSymbols.add(p.symbol);
          }
        }
      }
    } catch { /* ignore */ }

    // === Step 5: Merge all candidate symbols ===
    const allCandidates = new Set<string>([...sicSymbols.keys(), ...peerSymbols]);

    // Fetch profiles for all candidates (up to 40)
    const candidateList = Array.from(allCandidates).slice(0, 40);
    const profileResults = await Promise.allSettled(
      candidateList.map(async (s) => {
        const res = await fetch(
          `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(s)}&apikey=${fmpKey}`
        );
        if (!res.ok) return null;
        const data = await res.json();
        return Array.isArray(data) && data.length > 0 ? data[0] : null;
      })
    );

    // === Step 6: Score and filter ===
    interface ScoredPeer extends PeerCompany {
      relevance: number;
    }
    const scored: ScoredPeer[] = [];

    for (let i = 0; i < candidateList.length; i++) {
      const result = profileResults[i];
      if (result.status !== "fulfilled" || !result.value) continue;
      const p = result.value;
      const sym = candidateList[i];
      const peerSector = p.sector || "";
      const peerIndustry = p.industry || "";

      // Start with SIC-based relevance (4=exact SIC, 3=adjacent SIC, 0=not SIC-matched)
      let relevance = sicSymbols.get(sym) ?? 0;

      // For FMP peer-list companies without SIC match, score by sector/industry
      if (relevance === 0 && peerSymbols.has(sym)) {
        if (targetIndustry && peerIndustry === targetIndustry) {
          relevance = 2; // same industry via FMP classification
        } else if (targetSector && peerSector === targetSector) {
          relevance = 1; // same sector at least
        }
        // relevance 0 = different sector entirely → skip
      }

      if (relevance === 0) continue;
      // Skip delisted/private ($0 mkt cap) and very small companies
      if (!p.marketCap || p.marketCap < 10_000_000) continue;

      scored.push({
        symbol: p.symbol,
        name: p.companyName,
        marketCap: p.marketCap ?? 0,
        industry: peerIndustry || peerSector || "",
        logo: p.image || "",
        relevance,
      });
    }

    // Sort: highest relevance first, then by market cap descending
    scored.sort((a, b) => b.relevance - a.relevance || b.marketCap - a.marketCap);

    // Strip relevance before returning
    const peers: PeerCompany[] = scored.map(({ relevance: _, ...rest }) => rest);

    return new Response(JSON.stringify({ peers }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
