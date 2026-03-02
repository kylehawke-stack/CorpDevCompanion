import type { Context } from "@netlify/functions";

interface RequestBody {
  symbols: string[];
}

interface PeerFinancials {
  symbol: string;
  name: string;
  logo: string;
  revenue: number;
  grossProfit: number;
  grossMarginPct: number;
  netIncome: number;
  netMarginPct: number;
  operatingMarginPct?: number;
  ebitda?: number;
  ebitdaFormatted?: string;
  marketCap?: number;
  marketCapFormatted?: string;
  peRatio?: number;
  evToEbitda?: number;
  returnOnEquity?: number;
  debtToEquity?: number;
  currentRatio?: number;
  employees?: number;
}

function formatCurrency(val: number): string {
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${(val / 1e3).toFixed(0)}K`;
}

function pct(val: number): string {
  return `${(val * 100).toFixed(1)}%`;
}

async function fmpFetch(endpoint: string, params: Record<string, string>, fmpKey: string): Promise<any | null> {
  try {
    const qs = new URLSearchParams({ ...params, apikey: fmpKey });
    const res = await fetch(`https://financialmodelingprep.com/stable/${endpoint}?${qs}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Truncate an earnings call transcript to keep the analyst Q&A section
 * (most valuable for M&A intelligence) and a brief intro from prepared remarks.
 * For competitors we use a tighter budget than the acquirer.
 */
function truncateTranscript(content: string, budget: number = 2000): string {
  if (content.length <= budget) return content;

  const lower = content.toLowerCase();
  const markers = [
    "question-and-answer",
    "question and answer",
    "open the line for question",
    "open the floor",
    "begin the question",
    "first question comes from",
    "our first question",
  ];
  let qaIdx = -1;
  for (const m of markers) {
    const idx = lower.indexOf(m);
    if (idx !== -1 && idx > content.length * 0.25) {
      qaIdx = content.lastIndexOf("\n", idx);
      if (qaIdx === -1) qaIdx = idx;
      break;
    }
  }

  if (qaIdx > 0) {
    const qaSection = content.slice(qaIdx);
    const qaBudget = Math.min(qaSection.length, Math.floor(budget * 0.85));
    const remarksBudget = budget - qaBudget - 50;
    return (
      content.slice(0, Math.max(remarksBudget, 200)) +
      "\n[...prepared remarks truncated — see Q&A below...]\n" +
      qaSection.slice(0, qaBudget)
    );
  }

  return (
    content.slice(0, 300) +
    "\n[...truncated...]\n" +
    content.slice(-(budget - 350))
  );
}

/**
 * Build a rich financial + qualitative context string for a single competitor.
 */
function buildCompetitorContext(
  symbol: string,
  profile: any,
  income: any,
  balance: any,
  keyMetrics: any,
  revenueProduct: any,
  transcript: any,
  pressReleases: any
): string {
  const parts: string[] = [];
  const mcap = profile.marketCap ? formatCurrency(profile.marketCap) : "N/A";

  parts.push(`═══ ${profile.companyName} (${symbol}) ═══`);
  parts.push(`Market Cap: ${mcap} | Sector: ${profile.sector} — ${profile.industry}`);
  parts.push(`Employees: ${profile.fullTimeEmployees || "N/A"} | ${profile.country || "N/A"}`);
  if (profile.description) {
    parts.push(`Description: ${profile.description.slice(0, 300)}`);
  }

  if (income) {
    const rev = income.revenue ?? 0;
    const grossMargin = income.grossProfitRatio ? pct(income.grossProfitRatio) : "N/A";
    const opMargin = income.operatingIncomeRatio ? pct(income.operatingIncomeRatio) : "N/A";
    const netMargin = income.netIncomeRatio ? pct(income.netIncomeRatio) : "N/A";
    parts.push(`Revenue: ${formatCurrency(rev)} | Gross Margin: ${grossMargin} | Op Margin: ${opMargin} | Net Margin: ${netMargin}`);
    parts.push(`EBITDA: ${income.ebitda ? formatCurrency(income.ebitda) : "N/A"} | EPS: $${income.epsdiluted?.toFixed(2) ?? "N/A"}`);
  }

  if (balance) {
    parts.push(`Cash: ${formatCurrency(balance.cashAndCashEquivalents ?? 0)} | Debt: ${formatCurrency(balance.totalDebt ?? 0)} | Equity: ${formatCurrency(balance.totalStockholdersEquity ?? 0)}`);
  }

  if (keyMetrics) {
    const metrics: string[] = [];
    if (keyMetrics.peRatio) metrics.push(`P/E: ${keyMetrics.peRatio.toFixed(1)}`);
    if (keyMetrics.evToEbitda) metrics.push(`EV/EBITDA: ${keyMetrics.evToEbitda.toFixed(1)}`);
    if (keyMetrics.returnOnEquity) metrics.push(`ROE: ${pct(keyMetrics.returnOnEquity)}`);
    if (keyMetrics.debtToEquity != null) metrics.push(`D/E: ${keyMetrics.debtToEquity.toFixed(2)}`);
    if (keyMetrics.currentRatio) metrics.push(`Current: ${keyMetrics.currentRatio.toFixed(2)}`);
    if (metrics.length > 0) parts.push(`Key Metrics: ${metrics.join(" | ")}`);
  }

  if (Array.isArray(revenueProduct) && revenueProduct.length > 0) {
    const latest = revenueProduct[0];
    const dataObj = latest.data ?? latest;
    const segments = Object.entries(dataObj)
      .filter(([, v]) => typeof v === "number" && (v as number) > 0)
      .sort(([, a], [, b]) => (b as number) - (a as number));
    if (segments.length > 0) {
      const total = segments.reduce((sum, [, v]) => sum + (v as number), 0);
      const segStr = segments
        .slice(0, 5)
        .map(([name, val]) => `${name}: ${((val as number) / total * 100).toFixed(0)}%`)
        .join(", ");
      parts.push(`Revenue Segments: ${segStr}`);
    }
  }

  // Earnings call transcript excerpt (Q&A focused)
  if (Array.isArray(transcript) && transcript.length > 0 && transcript[0]?.content) {
    const t = transcript[0];
    const truncated = truncateTranscript(t.content);
    parts.push(`\nRecent Earnings Call (Q${t.quarter} ${t.year}):\n${truncated}`);
  }

  // Recent press releases
  if (Array.isArray(pressReleases) && pressReleases.length > 0) {
    const headlines = pressReleases
      .slice(0, 5)
      .map((pr: any) => {
        const date = pr.date?.split(" ")[0] ?? "";
        return `- ${date}: ${pr.title}`;
      });
    if (headlines.length > 0) {
      parts.push(`\nRecent Press Releases:\n${headlines.join("\n")}`);
    }
  }

  return parts.join("\n");
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
  const { symbols } = body;

  if (!symbols || symbols.length === 0) {
    return new Response(JSON.stringify({ error: "Missing symbols" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Compute most recent completed quarter for transcript fetching
  const now = new Date();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  let tYear = now.getFullYear();
  let tQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
  if (currentQuarter === 1) tYear--;

  try {
    const results = await Promise.allSettled(
      symbols.map(async (symbol) => {
        // Fetch all data sources in parallel — financial + qualitative
        const [
          profileData,
          incomeData,
          balanceData,
          keyMetricsData,
          revenueProductData,
          transcriptData,
          pressReleasesData,
        ] = await Promise.all([
          fmpFetch("profile", { symbol }, fmpKey),
          fmpFetch("income-statement", { symbol, period: "annual", limit: "1" }, fmpKey),
          fmpFetch("balance-sheet-statement", { symbol, period: "annual", limit: "1" }, fmpKey),
          fmpFetch("key-metrics", { symbol, period: "annual", limit: "1" }, fmpKey),
          fmpFetch("revenue-product-segmentation", { symbol, period: "annual" }, fmpKey),
          fmpFetch("earning-call-transcript", { symbol, year: String(tYear), quarter: String(tQuarter) }, fmpKey),
          fmpFetch("news/press-releases", { symbols: symbol, limit: "5" }, fmpKey),
        ]);

        const profile = Array.isArray(profileData) && profileData.length > 0 ? profileData[0] : null;
        const income = Array.isArray(incomeData) && incomeData.length > 0 ? incomeData[0] : null;
        const balance = Array.isArray(balanceData) && balanceData.length > 0 ? balanceData[0] : null;
        const keyMetrics = Array.isArray(keyMetricsData) && keyMetricsData.length > 0 ? keyMetricsData[0] : null;

        if (!profile || !income) return null;

        const revenue = income.revenue ?? 0;
        const grossProfit = income.grossProfit ?? 0;
        const netIncome = income.netIncome ?? 0;

        // Build rich context string for this competitor
        const contextString = buildCompetitorContext(
          symbol, profile, income, balance, keyMetrics, revenueProductData,
          transcriptData, pressReleasesData
        );

        const operatingIncome = income.operatingIncome ?? 0;
        const ebitda = income.ebitda ?? 0;

        return {
          financials: {
            symbol,
            name: profile.companyName ?? symbol,
            logo: profile.image ?? "",
            revenue,
            revenueFormatted: formatCurrency(revenue),
            grossProfit,
            grossProfitFormatted: formatCurrency(grossProfit),
            grossMarginPct: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
            netIncome,
            netIncomeFormatted: formatCurrency(netIncome),
            netMarginPct: revenue > 0 ? (netIncome / revenue) * 100 : 0,
            operatingMarginPct: revenue > 0 ? (operatingIncome / revenue) * 100 : undefined,
            ebitda: ebitda || undefined,
            ebitdaFormatted: ebitda ? formatCurrency(ebitda) : undefined,
            marketCap: profile.marketCap || undefined,
            marketCapFormatted: profile.marketCap ? formatCurrency(profile.marketCap) : undefined,
            peRatio: keyMetrics?.peRatio || undefined,
            evToEbitda: keyMetrics?.evToEbitda || undefined,
            returnOnEquity: keyMetrics?.returnOnEquity != null ? keyMetrics.returnOnEquity * 100 : undefined,
            debtToEquity: keyMetrics?.debtToEquity || undefined,
            currentRatio: keyMetrics?.currentRatio || undefined,
            employees: profile.fullTimeEmployees ? Number(profile.fullTimeEmployees) : undefined,
          } as PeerFinancials,
          contextString,
        };
      })
    );

    const peerFinancials: PeerFinancials[] = [];
    const contextParts: string[] = [];

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        peerFinancials.push(r.value.financials);
        contextParts.push(r.value.contextString);
      }
    }

    // Build the combined competitor prompt data
    const competitorPromptData = contextParts.length > 0
      ? `COMPETITOR & PEER INTELLIGENCE (${contextParts.length} companies):\nUse this data to understand the competitive landscape, relative valuations, strategic direction from earnings calls, and recent corporate activity from press releases.\n\n${contextParts.join("\n\n")}`
      : "";

    return new Response(JSON.stringify({ peerFinancials, competitorPromptData }), {
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
