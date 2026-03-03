import type { Context } from "@netlify/functions";
import { cachedFmpFetch } from "./lib/fmpCache.js";

export default async function handler(req: Request, _context: Context) {
  const fmpKey = process.env.FMP_API_KEY;
  if (!fmpKey) {
    return new Response(JSON.stringify({ error: "FMP API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const query = url.searchParams.get("query")?.trim();
  if (!query || query.length < 2) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const queryUpper = query.toUpperCase();

    // Search ticker, name, AND do a direct profile lookup in parallel.
    // The profile lookup ensures exact ticker matches (like "SPB") always appear
    // even if FMP's search endpoints return unrelated results.
    const [tickerData, nameData, profileData] = await Promise.all([
      cachedFmpFetch("search", { query }, fmpKey).then(d => Array.isArray(d) ? d : []),
      cachedFmpFetch("search-name", { query }, fmpKey).then(d => Array.isArray(d) ? d : []),
      cachedFmpFetch("profile", { symbol: queryUpper }, fmpKey).then(d => Array.isArray(d) ? d : []),
    ]);

    // Build the profile hit as a search result (if it exists and is a real stock)
    const profileHits: any[] = [];
    // Build a map of market cap from profile lookups
    const marketCapMap = new Map<string, number>();
    if (Array.isArray(profileData) && profileData.length > 0) {
      const p = profileData[0];
      if (p.symbol && p.companyName) {
        profileHits.push({
          symbol: p.symbol,
          name: p.companyName,
          exchange: p.exchangeShortName || p.exchange || '',
        });
        if (p.marketCap) marketCapMap.set(p.symbol, p.marketCap);
      }
    }

    // Merge and deduplicate: profile hit first, then ticker matches, then name matches
    const seen = new Set<string>();
    const combined: any[] = [];
    for (const d of [...profileHits, ...(Array.isArray(tickerData) ? tickerData : []), ...(Array.isArray(nameData) ? nameData : [])]) {
      if (d.symbol && !seen.has(d.symbol)) {
        seen.add(d.symbol);
        combined.push(d);
      }
    }

    // Filter to stocks with reasonable exchanges, always keep exact ticker matches
    const filtered = combined
      .filter((d: any) => {
        if (d.symbol?.toUpperCase() === queryUpper) return true;
        const ex = d.exchange || d.exchangeShortName || '';
        if (!ex) return true;
        return !["OTC", "CRYPTO"].includes(ex);
      });

    // Sort: exact ticker match first, then starts-with, then rest
    filtered.sort((a: any, b: any) => {
      const aExact = a.symbol?.toUpperCase() === queryUpper ? 0 : 1;
      const bExact = b.symbol?.toUpperCase() === queryUpper ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      const aStarts = a.symbol?.toUpperCase().startsWith(queryUpper) ? 0 : 1;
      const bStarts = b.symbol?.toUpperCase().startsWith(queryUpper) ? 0 : 1;
      return aStarts - bStarts;
    });

    const results = filtered
      .slice(0, 8)
      .map((d: any) => ({
        symbol: d.symbol,
        name: d.name || d.companyName || '',
        exchange: d.exchange || d.exchangeShortName || '',
        marketCap: marketCapMap.get(d.symbol) || d.marketCap || 0,
      }));

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
