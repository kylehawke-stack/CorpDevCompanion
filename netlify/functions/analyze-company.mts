import type { Context } from "@netlify/functions";
import { cachedFmpFetch } from "./lib/fmpCache.js";

interface FmpProfile {
  symbol: string;
  companyName: string;
  description: string;
  marketCap: number;
  price: number;
  sector: string;
  industry: string;
  ceo: string;
  fullTimeEmployees: string;
  website: string;
  image: string;
  country: string;
}

interface RequestBody {
  symbol: string;
}

/**
 * Truncate an earnings call transcript to keep the analyst Q&A section
 * (most valuable for M&A intelligence) and a brief intro from prepared remarks.
 * Each transcript is ~20K chars; we cap at ~5K per transcript.
 */
function truncateTranscript(content: string, budget: number = 4000): string {
  if (content.length <= budget) return content;

  // Q&A section typically starts with the operator announcing questions
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
      // Walk back to start of this line
      qaIdx = content.lastIndexOf("\n", idx);
      if (qaIdx === -1) qaIdx = idx;
      break;
    }
  }

  if (qaIdx > 0) {
    const qaSection = content.slice(qaIdx);
    // Give 80% of budget to Q&A, 20% to prepared remarks intro
    const qaBudget = Math.min(qaSection.length, Math.floor(budget * 0.8));
    const remarksBudget = budget - qaBudget - 50; // 50 chars for separator
    return (
      content.slice(0, Math.max(remarksBudget, 300)) +
      "\n[...prepared remarks truncated — see Q&A below...]\n" +
      qaSection.slice(0, qaBudget)
    );
  }

  // Fallback: keep beginning and end (Q&A is at the end)
  return (
    content.slice(0, 500) +
    "\n[...truncated...]\n" +
    content.slice(-(budget - 550))
  );
}

function formatCurrency(val: number): string {
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function pct(val: number): string {
  return `${(val * 100).toFixed(1)}%`;
}

export default async function handler(req: Request, _context: Context) {
  const fmpKey = process.env.FMP_API_KEY;

  const body: RequestBody = await req.json();
  const { symbol } = body;

  if (!fmpKey) {
    return new Response(
      JSON.stringify({ error: "FMP API key not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Fetch all FMP data sources in parallel ──
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);

  // Compute date range for SEC filings + news (3 years back)
  const threeYearsAgo = new Date(now);
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const fromDate = threeYearsAgo.toISOString().split("T")[0];
  const toDate = now.toISOString().split("T")[0];

  // Compute the 4 most recent completed quarters (going backwards)
  const recentQuarters: { year: number; quarter: number }[] = [];
  let qYear = currentYear;
  let qNum = currentQuarter === 1 ? 4 : currentQuarter - 1;
  if (currentQuarter === 1) qYear--;
  for (let i = 0; i < 4; i++) {
    recentQuarters.push({ year: qYear, quarter: qNum });
    qNum--;
    if (qNum === 0) { qNum = 4; qYear--; }
  }

  const [
    profileData,
    incomeData,
    balanceData,
    keyMetricsData,
    ...transcriptResults
  ] = await Promise.all([
    cachedFmpFetch("profile", { symbol }, fmpKey),
    cachedFmpFetch("income-statement", { symbol, period: "annual", limit: "4" }, fmpKey),
    cachedFmpFetch("balance-sheet-statement", { symbol, period: "annual", limit: "1" }, fmpKey),
    cachedFmpFetch("key-metrics", { symbol, period: "annual", limit: "1" }, fmpKey),
    ...recentQuarters.map((q) =>
      cachedFmpFetch("earning-call-transcript", { symbol, year: String(q.year), quarter: String(q.quarter) }, fmpKey)
    ),
  ]);

  // Fetch analyst data + cash flow + revenue segmentation in parallel
  const [estimatesData, priceTargetData, cashFlowData, revenueProductData, revenueGeoData, peersCsvText, secFilingsData, maSearchData, stockNewsData] = await Promise.all([
    cachedFmpFetch("analyst-estimates", { symbol, period: "annual", limit: "1" }, fmpKey),
    cachedFmpFetch("price-target-consensus", { symbol }, fmpKey),
    cachedFmpFetch("cash-flow-statement", { symbol, period: "annual", limit: "2" }, fmpKey),
    cachedFmpFetch("revenue-product-segmentation", { symbol, period: "annual" }, fmpKey),
    cachedFmpFetch("revenue-geographic-segments", { symbol, period: "annual" }, fmpKey),
    Promise.resolve(""), // peers resolved from hardcoded data below
    cachedFmpFetch("sec-filings-search/symbol", { symbol, from: fromDate, to: toDate, limit: "100" }, fmpKey),
    // Search M&A by both symbol and company name to find more deals
    (async () => {
      const companyName = (Array.isArray(profileData) && profileData.length > 0) ? profileData[0].companyName : null;
      const bySymbol = await cachedFmpFetch("mergers-acquisitions-search", { name: symbol, limit: "10" }, fmpKey);
      if (companyName) {
        const byName = await cachedFmpFetch("mergers-acquisitions-search", { name: companyName, limit: "10" }, fmpKey);
        const seen = new Set<string>();
        const merged: any[] = [];
        for (const d of [...(Array.isArray(bySymbol) ? bySymbol : []), ...(Array.isArray(byName) ? byName : [])]) {
          const key = `${d.targetedCompanyName || ''}-${d.transactionDate || ''}`;
          if (!seen.has(key)) { seen.add(key); merged.push(d); }
        }
        return merged;
      }
      return bySymbol;
    })(),
    cachedFmpFetch("news/stock", { symbols: symbol, from: fromDate, to: toDate, limit: "100" }, fmpKey),
  ]);

  // Collect all successfully fetched transcripts (newest first)
  const allTranscripts: { quarter: number; year: number; content: string }[] = [];
  for (const result of transcriptResults) {
    if (Array.isArray(result) && result.length > 0 && result[0]?.content) {
      allTranscripts.push(result[0]);
    }
  }

  // ── Parse profile ──
  const profile: FmpProfile | null =
    Array.isArray(profileData) && profileData.length > 0 ? profileData[0] : null;

  if (!profile) {
    return new Response(
      JSON.stringify({ error: "Could not fetch company profile" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const mcap = formatCurrency(profile.marketCap);

  // ── Competitive Intelligence Pipeline ──
  // Wrapped in try/catch — competitive intel is best-effort, never blocks the main flow
  interface CompetitorData {
    symbol: string;
    name: string;
    marketCap: number;
    sector: string;
    industry: string;
    description: string;
    isDirect: boolean;
    keyMetrics?: any;
    productSegments?: string[];
  }
  let topCompetitors: CompetitorData[] = [];

  // Hardcoded competitor data for HBB (pre-fetched from FMP peers-bulk + profiles)
  // This avoids ~22 extra API calls that were causing Netlify function timeouts
  const HARDCODED_COMPETITORS: Record<string, CompetitorData[]> = {
    HBB: [
      { symbol: "FLXS", name: "Flexsteel Industries", marketCap: 275_000_000, sector: "Consumer Cyclical", industry: "Furnishings, Fixtures & Appliances", description: "Flexsteel Industries manufactures and sells residential and contract furniture products.", isDirect: true, productSegments: ["Residential", "Commercial"] },
      { symbol: "LOVE", name: "The Lovesac Company", marketCap: 490_000_000, sector: "Consumer Cyclical", industry: "Furnishings, Fixtures & Appliances", description: "The Lovesac Company designs, manufactures, and sells furniture including modular couches and accessories.", isDirect: true, productSegments: ["Sactionals", "Sacs", "Accessories"] },
      { symbol: "IRBT", name: "iRobot Corporation", marketCap: 190_000_000, sector: "Consumer Cyclical", industry: "Furnishings, Fixtures & Appliances", description: "iRobot designs and builds robots for consumers including the Roomba vacuum.", isDirect: false, productSegments: ["Roomba", "Braava", "Accessories"] },
      { symbol: "LCUT", name: "Lifetime Brands", marketCap: 135_000_000, sector: "Consumer Cyclical", industry: "Furnishings, Fixtures & Appliances", description: "Lifetime Brands provides kitchenware, tableware, and home products under brands like Farberware, KitchenAid, Mikasa.", isDirect: false, productSegments: ["Kitchenware", "Tableware", "Home Solutions"] },
      { symbol: "SNBR", name: "Sleep Number Corporation", marketCap: 400_000_000, sector: "Consumer Cyclical", industry: "Furnishings, Fixtures & Appliances", description: "Sleep Number designs, manufactures, and sells beds and bedding accessories.", isDirect: false, productSegments: ["Smart Beds", "Bedding", "Accessories"] },
    ],
  };
  topCompetitors = HARDCODED_COMPETITORS[symbol] ?? [];

  // ── Build financial statements section ──
  let financialsSection = "";
  if (Array.isArray(incomeData) && incomeData.length > 0) {
    const latest = incomeData[0];
    const prior = incomeData.length > 1 ? incomeData[1] : null;
    const revenueGrowth = prior && prior.revenue > 0
      ? ` (${((latest.revenue - prior.revenue) / prior.revenue * 100).toFixed(1)}% YoY growth)`
      : "";
    // 3-year CAGR if we have 4 years of data
    const threeYearsAgoIncome = incomeData.length >= 4 ? incomeData[3] : null;
    const cagr3yr = threeYearsAgoIncome && threeYearsAgoIncome.revenue > 0
      ? (Math.pow(latest.revenue / threeYearsAgoIncome.revenue, 1 / 3) - 1) * 100
      : null;
    const cagrStr = cagr3yr !== null
      ? `, ${cagr3yr >= 0 ? "+" : ""}${cagr3yr.toFixed(1)}% 3yr CAGR`
      : "";
    financialsSection += `
INCOME STATEMENT (${latest.date}):
- Revenue: ${formatCurrency(latest.revenue)}${revenueGrowth}${cagrStr}
- Gross Profit: ${formatCurrency(latest.grossProfit)} (${latest.revenue > 0 ? pct(latest.grossProfit / latest.revenue) : "N/A"} margin)
- Operating Income: ${formatCurrency(latest.operatingIncome)} (${latest.revenue > 0 ? pct(latest.operatingIncome / latest.revenue) : "N/A"} margin)
- Net Income: ${formatCurrency(latest.netIncome)} (${latest.revenue > 0 ? pct(latest.netIncome / latest.revenue) : "N/A"} margin)
- EBITDA: ${formatCurrency(latest.ebitda)}
- EPS: $${(latest.epsDiluted ?? latest.epsdiluted)?.toFixed(2) ?? "N/A"}
`;
  }

  if (Array.isArray(balanceData) && balanceData.length > 0) {
    const bs = balanceData[0];
    financialsSection += `
BALANCE SHEET (${bs.date}):
- Total Assets: ${formatCurrency(bs.totalAssets)}
- Cash & Equivalents: ${formatCurrency(bs.cashAndCashEquivalents)}
- Total Debt: ${formatCurrency(bs.totalDebt)}
- Net Debt: ${formatCurrency(bs.netDebt)}
- Stockholders' Equity: ${formatCurrency(bs.totalStockholdersEquity)}
- Goodwill + Intangibles: ${formatCurrency((bs.goodwill || 0) + (bs.intangibleAssets || 0))}
`;
  }

  // ── Build cash flow section ──
  if (Array.isArray(cashFlowData) && cashFlowData.length > 0) {
    const cf = cashFlowData[0];
    const priorCf = cashFlowData.length > 1 ? cashFlowData[1] : null;
    const fcf = (cf.operatingCashFlow || 0) - Math.abs(cf.capitalExpenditure || 0);
    const priorFcf = priorCf ? (priorCf.operatingCashFlow || 0) - Math.abs(priorCf.capitalExpenditure || 0) : null;
    const fcfGrowth = priorFcf && priorFcf !== 0
      ? ` (${((fcf - priorFcf) / Math.abs(priorFcf) * 100).toFixed(1)}% YoY)`
      : "";
    financialsSection += `
CASH FLOW STATEMENT (${cf.date}):
- Operating Cash Flow: ${formatCurrency(cf.operatingCashFlow)}
- Capital Expenditure: ${formatCurrency(Math.abs(cf.capitalExpenditure || 0))}
- Free Cash Flow: ${formatCurrency(fcf)}${fcfGrowth}
- Acquisitions: ${cf.acquisitionsNet ? formatCurrency(Math.abs(cf.acquisitionsNet)) : "None"}
- Dividends Paid: ${cf.netDividendsPaid ? formatCurrency(Math.abs(cf.netDividendsPaid)) : (cf.commonDividendsPaid ? formatCurrency(Math.abs(cf.commonDividendsPaid)) : "N/A")}
- Share Repurchases: ${cf.commonStockRepurchased ? formatCurrency(Math.abs(cf.commonStockRepurchased)) : "N/A"}
- Debt Repayment: ${cf.debtRepayment ? formatCurrency(Math.abs(cf.debtRepayment)) : "N/A"}
`;
  }

  // ── Build revenue segmentation sections ──
  // FMP returns { data: { "Segment Name": revenue_number } } nested structure
  let segmentationSection = "";
  const revenueSegments: { name: string; revenue: number; percent: number }[] = [];

  if (Array.isArray(revenueProductData) && revenueProductData.length > 0) {
    const latest = revenueProductData[0];
    const dataObj = latest.data ?? latest;
    const segments = Object.entries(dataObj)
      .filter(([, v]) => typeof v === "number" && (v as number) > 0)
      .sort(([, a], [, b]) => (b as number) - (a as number));
    if (segments.length > 0) {
      const total = segments.reduce((sum, [, v]) => sum + (v as number), 0);
      for (const [name, val] of segments) {
        revenueSegments.push({
          name,
          revenue: val as number,
          percent: Math.round(((val as number) / total) * 100),
        });
      }
      segmentationSection += `
REVENUE BY PRODUCT SEGMENT:
${segments.map(([name, val]) => `- ${name}: ${formatCurrency(val as number)} (${((val as number) / total * 100).toFixed(0)}%)`).join("\n")}
`;
    }
  }

  if (Array.isArray(revenueGeoData) && revenueGeoData.length > 0) {
    const latest = revenueGeoData[0];
    const dataObj = latest.data ?? latest;
    const regions = Object.entries(dataObj)
      .filter(([, v]) => typeof v === "number" && (v as number) > 0)
      .sort(([, a], [, b]) => (b as number) - (a as number));
    if (regions.length > 0) {
      const total = regions.reduce((sum, [, v]) => sum + (v as number), 0);
      segmentationSection += `
REVENUE BY GEOGRAPHY:
${regions.map(([name, val]) => `- ${name}: ${formatCurrency(val as number)} (${((val as number) / total * 100).toFixed(0)}%)`).join("\n")}
`;
    }
  }

  // ── Build key metrics section ──
  let metricsSection = "";
  if (Array.isArray(keyMetricsData) && keyMetricsData.length > 0) {
    const km = keyMetricsData[0];
    const peRatio = km.peRatio ?? (km.earningsYield ? 1 / km.earningsYield : null);
    const evEbitda = km.evToEbitda ?? km.evToEBITDA ?? null;
    const deRatioKm = km.debtToEquity ?? (
      Array.isArray(balanceData) && balanceData.length > 0 && balanceData[0].totalStockholdersEquity
        ? (balanceData[0].totalDebt || 0) / balanceData[0].totalStockholdersEquity
        : null
    );
    metricsSection = `
KEY FINANCIAL METRICS:
- P/E Ratio: ${peRatio?.toFixed(1) ?? "N/A"} | EV/EBITDA: ${evEbitda?.toFixed(1) ?? "N/A"}
- Return on Equity: ${km.returnOnEquity ? pct(km.returnOnEquity) : "N/A"} | Return on Assets: ${km.returnOnAssets ? pct(km.returnOnAssets) : "N/A"}
- Debt/Equity: ${deRatioKm?.toFixed(2) ?? "N/A"} | Current Ratio: ${km.currentRatio?.toFixed(2) ?? "N/A"}
- Enterprise Value: ${km.enterpriseValue ? formatCurrency(km.enterpriseValue) : "N/A"}
`;
  }

  // ── Build earnings transcript section (last 4 quarters) ──
  // Each transcript is ~20K chars. We truncate to ~5K each (keeping analyst Q&A)
  // to keep the Claude API call fast enough for Netlify's function timeout.
  let transcriptSection = "";
  if (allTranscripts.length > 0) {
    const transcriptParts = allTranscripts.map((t) =>
      `--- Q${t.quarter} ${t.year} EARNINGS CALL ---\n${truncateTranscript(t.content)}`
    );
    transcriptSection = `
EARNINGS CALL TRANSCRIPTS (last ${allTranscripts.length} quarters, analyst Q&A prioritized):
IMPORTANT: The analyst Q&A sections below are the most valuable. Analyst questions surface real concerns, strategic tensions, and opportunities that management glosses over. Prefer Q&A quotes when citing insights.

${transcriptParts.join("\n\n")}
`;
  }

  // ── Build analyst estimates section ──
  let analystSection = "";
  if (Array.isArray(estimatesData) && estimatesData.length > 0) {
    const est = estimatesData[0];
    // FMP uses both field naming conventions depending on the endpoint version
    const revAvg = est.revenueAvg ?? est.estimatedRevenueAvg;
    const revLow = est.revenueLow ?? est.estimatedRevenueLow;
    const revHigh = est.revenueHigh ?? est.estimatedRevenueHigh;
    const epsAvg = est.epsAvg ?? est.estimatedEpsAvg;
    const epsLow = est.epsLow ?? est.estimatedEpsLow;
    const epsHigh = est.epsHigh ?? est.estimatedEpsHigh;
    const netIncAvg = est.netIncomeAvg ?? est.estimatedNetIncomeAvg;
    const ebitdaAvg = est.ebitdaAvg ?? est.estimatedEbitdaAvg;
    const numAnalysts = est.numAnalystsRevenue ?? est.numAnalystsEps ?? est.numberAnalystEstimatedRevenue;
    analystSection = `
ANALYST ESTIMATES (${est.date}):
- Estimated Revenue: ${revAvg ? formatCurrency(revAvg) : "N/A"} (Low: ${revLow ? formatCurrency(revLow) : "N/A"} — High: ${revHigh ? formatCurrency(revHigh) : "N/A"})
- Estimated EPS: $${epsAvg?.toFixed?.(2) ?? "N/A"} (Low: $${epsLow?.toFixed?.(2) ?? "N/A"} — High: $${epsHigh?.toFixed?.(2) ?? "N/A"})
- Estimated Net Income: ${netIncAvg ? formatCurrency(netIncAvg) : "N/A"}
- Estimated EBITDA: ${ebitdaAvg ? formatCurrency(ebitdaAvg) : "N/A"}
- Number of Analysts: ${numAnalysts ?? "N/A"}
`;
  }

  if (Array.isArray(priceTargetData) && priceTargetData.length > 0) {
    const pt = priceTargetData[0];
    analystSection += `
ANALYST PRICE TARGETS:
- Consensus: $${pt.targetConsensus?.toFixed(2) ?? "N/A"}
- High: $${pt.targetHigh?.toFixed(2) ?? "N/A"} | Low: $${pt.targetLow?.toFixed(2) ?? "N/A"}
`;
  }

  // ── Build competitive landscape section ──
  let competitiveLandscapeSection = "";
  if (topCompetitors.length > 0) {
    competitiveLandscapeSection = `
COMPETITIVE LANDSCAPE (${topCompetitors.length} relevant peers identified):
${topCompetitors.map((c, i) => {
      const mcapStr = formatCurrency(c.marketCap);
      const type = c.isDirect ? "Direct peer" : "Extended peer";
      let line = `${i + 1}. ${c.name} (${c.symbol}) — ${mcapStr} mkt cap [${type}]`;
      line += `\n   Industry: ${c.industry}`;
      if (c.productSegments && c.productSegments.length > 0) {
        line += `\n   Product segments: ${c.productSegments.join(", ")}`;
      }
      if (c.keyMetrics) {
        const km = c.keyMetrics;
        const metrics: string[] = [];
        if (km.peRatio) metrics.push(`P/E: ${km.peRatio.toFixed(1)}`);
        if (km.evToEbitda) metrics.push(`EV/EBITDA: ${km.evToEbitda.toFixed(1)}`);
        if (km.debtToEquity != null) metrics.push(`D/E: ${km.debtToEquity.toFixed(2)}`);
        if (metrics.length > 0) line += `\n   Metrics: ${metrics.join(" | ")}`;
      }
      if (c.description) line += `\n   ${c.description}`;
      return line;
    }).join("\n\n")}
`;
  }

  // ── Build SEC filings section ──
  let secFilingsSection = "";
  if (Array.isArray(secFilingsData) && secFilingsData.length > 0) {
    // Interesting filing types for M&A context
    const relevantTypes = new Set(["8-K", "8-K/A", "10-K", "10-K/A", "S-1", "S-4", "DEF 14A", "SC 13D", "SC TO-T"]);
    const relevantFilings = secFilingsData.filter((f: any) => relevantTypes.has(f.formType ?? f.type));
    if (relevantFilings.length > 0) {
      secFilingsSection = `
SEC FILINGS (last 3 years — ${relevantFilings.length} material filings):
These indicate acquisitions, divestitures, leadership changes, mergers, and other significant business events:
${relevantFilings.slice(0, 20).map((f: any) => {
        const date = (f.filingDate || f.acceptedDate || "Unknown date").split(" ")[0];
        const formType = f.formType ?? f.type;
        return `- ${date}: ${formType}`;
      }).join("\n")}
`;
    }
  }

  // ── Build M&A activity section from FMP mergers & acquisitions data ──
  let maSection = "";
  if (Array.isArray(maSearchData) && maSearchData.length > 0) {
    maSection = `
MERGERS & ACQUISITIONS ACTIVITY:
${maSearchData.slice(0, 10).map((deal: any) => {
      const parts: string[] = [];
      if (deal.targetedCompanyName) parts.push(`Target: ${deal.targetedCompanyName}`);
      if (deal.acquirerName || deal.companyName) parts.push(`Acquirer: ${deal.acquirerName || deal.companyName}`);
      if (deal.transactionDate) parts.push(`Date: ${deal.transactionDate}`);
      if (deal.transactionValue) parts.push(`Value: $${(deal.transactionValue / 1e6).toFixed(0)}M`);
      if (deal.status) parts.push(`Status: ${deal.status}`);
      return `- ${parts.join(" | ")}`;
    }).join("\n")}
`;
  }

  // ── Build stock news section ──
  let newsSection = "";
  if (Array.isArray(stockNewsData) && stockNewsData.length > 0) {
    // Filter to company-specific news (FMP already filters by symbol, but skip generic roundups)
    const companyName = profile.companyName.split(" ").slice(0, 2).join(" ").toUpperCase();
    const materialNews = stockNewsData.filter((n: any) => {
      const title = (n.title || "").toUpperCase();
      return title.includes(symbol.toUpperCase()) ||
        title.includes(companyName) ||
        (n.site || "").toLowerCase().includes("prnewswire") ||
        (n.publisher || "").toLowerCase().includes("prnewswire");
    });
    if (materialNews.length > 0) {
      newsSection = `
NEWS & PRESS RELEASES (last 3 years — ${materialNews.length} items):
${materialNews.slice(0, 30).map((n: any) => {
        const date = (n.publishedDate || n.date || "").split(" ")[0];
        const snippet = n.text ? ` — ${n.text.slice(0, 150)}` : "";
        return `- ${date}: ${n.title}${snippet}`;
      }).join("\n")}
`;
    }
  }

  // ── Build deterministic highlight cards 1-6 from raw FMP data ──
  const highlights: { label: string; value: string; detail: string; observation: string }[] = [];

  // Card 1: Revenue & Growth
  if (Array.isArray(incomeData) && incomeData.length > 0) {
    const latest = incomeData[0];
    const prior = incomeData.length > 1 ? incomeData[1] : null;
    const rev = latest.revenue;
    const growthPct = prior && prior.revenue > 0
      ? ((rev - prior.revenue) / prior.revenue * 100) : null;

    // 3-year CAGR for the card
    const threeYearsAgoRev = incomeData.length >= 4 ? incomeData[3] : null;
    const revenueGrowthPct3yr = threeYearsAgoRev && threeYearsAgoRev.revenue > 0
      ? (Math.pow(rev / threeYearsAgoRev.revenue, 1 / 3) - 1) * 100
      : null;

    let detail: string;
    if (growthPct !== null && revenueGrowthPct3yr !== null) {
      const yoyStr = growthPct >= 0 ? `+${growthPct.toFixed(1)}% YoY` : `(${Math.abs(growthPct).toFixed(1)}%) YoY`;
      const cagrStr = revenueGrowthPct3yr >= 0 ? `+${revenueGrowthPct3yr.toFixed(1)}%` : `(${Math.abs(revenueGrowthPct3yr).toFixed(1)}%)`;
      detail = `${yoyStr}, ${cagrStr} 3yr CAGR`;
    } else if (growthPct !== null) {
      detail = growthPct >= 0 ? `+${growthPct.toFixed(1)}% YoY growth` : `(${Math.abs(growthPct).toFixed(1)}%) YoY decline`;
    } else {
      detail = "";
    }

    // Build CAGR-first observation: lead with the 3yr trend, then the YoY context
    const cagrFmt = revenueGrowthPct3yr !== null
      ? (revenueGrowthPct3yr >= 0 ? `+${revenueGrowthPct3yr.toFixed(1)}%` : `(${Math.abs(revenueGrowthPct3yr).toFixed(1)}%)`)
      : null;

    let obs: string;
    if (growthPct === null) {
      obs = "Limited historical data for trend analysis.";
    } else if (cagrFmt !== null) {
      // Lead with 3yr CAGR, then contextualize with YoY
      const yoyFmt = growthPct >= 0 ? `+${growthPct.toFixed(1)}%` : `(${Math.abs(growthPct).toFixed(1)}%)`;
      if (revenueGrowthPct3yr! > 3) {
        obs = `3-year revenue CAGR of ${cagrFmt} signals sustained growth momentum. The most recent year came in at ${yoyFmt} YoY. This trajectory gives the company leverage to be selective in M&A — acquisitions are additive, not essential.`;
      } else if (revenueGrowthPct3yr! > 0) {
        obs = `3-year revenue CAGR of ${cagrFmt} shows modest but positive long-term growth. The latest year delivered ${yoyFmt} YoY. Targeted acquisitions could meaningfully accelerate revenue beyond this organic baseline.`;
      } else if (growthPct > 0) {
        obs = `3-year revenue CAGR of ${cagrFmt} indicates longer-term headwinds despite a recent uptick of ${yoyFmt} YoY. M&A could provide a structural step-change in the growth trajectory.`;
      } else {
        obs = `3-year revenue CAGR of ${cagrFmt} combined with ${yoyFmt} most recent YoY performance underscores urgency for portfolio diversification or category expansion through M&A.`;
      }
    } else if (growthPct > 10) {
      obs = `Strong organic momentum at +${growthPct.toFixed(1)}% makes acquisitions additive rather than necessary for top-line growth. The business can afford to be selective.`;
    } else if (growthPct > 3) {
      obs = `Moderate organic growth at +${growthPct.toFixed(1)}% provides a stable foundation. Acquisitions could meaningfully accelerate revenue beyond organic capabilities.`;
    } else if (growthPct > 0) {
      obs = `Low single-digit growth at +${growthPct.toFixed(1)}% creates a compelling case for inorganic acceleration through targeted acquisitions.`;
    } else {
      obs = `Revenue contraction of (${Math.abs(growthPct).toFixed(1)}%) underscores urgency for portfolio diversification or category expansion through M&A.`;
    }

    highlights.push({ label: "Revenue & Growth", value: formatCurrency(rev), detail, observation: obs });
  }

  // Card 2: Profitability
  if (Array.isArray(incomeData) && incomeData.length > 0) {
    const latest = incomeData[0];
    const grossMargin = latest.revenue > 0 ? (latest.grossProfit / latest.revenue) * 100 : 0;
    const opMargin = latest.revenue > 0 ? (latest.operatingIncome / latest.revenue) * 100 : 0;

    let obs: string;
    if (opMargin > 15) obs = `Healthy operating margins of ${opMargin.toFixed(1)}% provide acquisition flexibility — the company can absorb integration costs and temporarily dilutive deals without earnings pressure.`;
    else if (opMargin > 8) obs = `Moderate margins suggest acquisitions should be accretive or target margin-enhancing capabilities like manufacturing efficiency, brand premium, or scale advantages.`;
    else if (opMargin > 0) obs = `Thin operating margins at ${opMargin.toFixed(1)}% mean M&A targets should bring margin improvement — avoid complex integrations that could further compress profitability.`;
    else obs = `Negative operating margins constrain deal capacity. Focus on margin-accretive tuck-ins or operational efficiency plays that improve the cost structure.`;

    highlights.push({
      label: "Profitability",
      value: `${grossMargin.toFixed(1)}%`,
      detail: `${opMargin.toFixed(1)}% operating margin`,
      observation: obs,
    });
  }

  // Card 3: Cash Flow & Firepower
  if (Array.isArray(cashFlowData) && cashFlowData.length > 0) {
    const cf = cashFlowData[0];
    const fcf = (cf.operatingCashFlow || 0) - Math.abs(cf.capitalExpenditure || 0);
    const cashOnHand = Array.isArray(balanceData) && balanceData.length > 0
      ? (balanceData[0].cashAndCashEquivalents || 0) : 0;
    const revForMargin = Array.isArray(incomeData) && incomeData.length > 0 ? incomeData[0].revenue : 0;
    const fcfMargin = revForMargin > 0 ? (fcf / revForMargin * 100) : null;

    let obs: string;
    if (fcf > 0 && fcfMargin !== null && fcfMargin > 10) obs = `Strong free cash flow generation at ${fcfMargin.toFixed(0)}% of revenue. The company can self-fund bolt-on acquisitions without external financing.`;
    else if (fcf > 0) obs = `Positive FCF of ${formatCurrency(fcf)} supports smaller acquisitions. Larger transformational deals would likely require debt financing or equity issuance.`;
    else obs = `Negative free cash flow of (${formatCurrency(Math.abs(fcf))}) limits self-funded M&A. Acquisitions would require external capital or asset divestitures.`;

    highlights.push({
      label: "Cash Flow & Firepower",
      value: formatCurrency(fcf),
      detail: `${formatCurrency(cashOnHand)} cash on hand`,
      observation: obs,
    });
  }

  // Card 4: Acquisition Firepower (leverage-adjusted)
  if (Array.isArray(balanceData) && balanceData.length > 0) {
    const bs = balanceData[0];
    const cash = bs.cashAndCashEquivalents || 0;
    const fcf = Array.isArray(cashFlowData) && cashFlowData.length > 0
      ? (cashFlowData[0].operatingCashFlow || 0) - Math.abs(cashFlowData[0].capitalExpenditure || 0)
      : 0;

    // Dynamic FCF multiplier: scale 0-3x based on D/E leverage headroom
    const DE_CEILING = 2.0;
    const MAX_MULT = 3.0;
    const deRatioForFP = Array.isArray(keyMetricsData) && keyMetricsData.length > 0 && keyMetricsData[0].debtToEquity != null
      ? keyMetricsData[0].debtToEquity
      : (bs.totalDebt || 0) / (bs.totalStockholdersEquity || 1);
    const headroom = Math.max(0, Math.min(1, (DE_CEILING - deRatioForFP) / DE_CEILING));
    const fcfMult = headroom * MAX_MULT;
    const estCapacity = Math.max(fcf * fcfMult, 0);
    const dryPowder = cash + estCapacity;

    let obs: string;
    if (dryPowder > 500_000_000) obs = "Substantial war chest enables transformational deals. Could pursue platform acquisitions without significant leverage or equity dilution.";
    else if (dryPowder > 100_000_000) obs = "Moderate acquisition firepower supports several bolt-on deals or one meaningful platform acquisition with additional debt financing.";
    else if (dryPowder > 25_000_000) obs = "Limited but workable dry powder best suited for targeted tuck-in acquisitions. Larger deals would require significant leverage or equity.";
    else obs = "Minimal acquisition firepower without external financing. Consider joint ventures, earn-out structures, or equity-funded deals to preserve cash.";

    highlights.push({
      label: "Acquisition Firepower",
      value: formatCurrency(dryPowder),
      detail: `${formatCurrency(cash)} cash + ${formatCurrency(estCapacity)} est. capacity (${fcfMult.toFixed(1)}x FCF at ${deRatioForFP.toFixed(1)}x D/E)`,
      observation: obs,
    });
  }

  // Card 5: Leverage & Capacity
  if (Array.isArray(balanceData) && balanceData.length > 0) {
    const bs = balanceData[0];
    const totalDebt = bs.totalDebt || 0;
    const equity = bs.totalStockholdersEquity || 1;
    const netDebt = bs.netDebt || 0;
    const deRatio = Array.isArray(keyMetricsData) && keyMetricsData.length > 0 && keyMetricsData[0].debtToEquity != null
      ? keyMetricsData[0].debtToEquity
      : totalDebt / equity;

    let obs: string;
    if (deRatio < 0.3) obs = "Very low leverage provides significant borrowing capacity for debt-financed acquisitions. The balance sheet is conservatively managed with room to lever up.";
    else if (deRatio < 1.0) obs = `Moderate leverage at ${deRatio.toFixed(2)}x with room for incremental debt to finance acquisitions. Could likely add 1-2x EBITDA in deal-related borrowing.`;
    else if (deRatio < 2.0) obs = "Elevated leverage limits debt-funded M&A capacity. Prioritize cash-generative targets or equity-based deal structures to avoid over-leveraging.";
    else obs = "High leverage significantly constrains M&A financing options. Focus on de-leveraging before pursuing acquisitions, or structure deals with all-equity consideration.";

    highlights.push({
      label: "Leverage & Capacity",
      value: `${deRatio.toFixed(2)}x`,
      detail: `D/E: ${deRatio.toFixed(2)}x | Net Debt: ${formatCurrency(netDebt)}`,
      observation: obs,
    });
  }

  // Card 6: Acquisitiveness
  {
    const latestAcq = Array.isArray(cashFlowData) && cashFlowData.length > 0
      ? Math.abs(cashFlowData[0].acquisitionsNet || 0) : 0;
    const priorAcq = Array.isArray(cashFlowData) && cashFlowData.length > 1
      ? Math.abs(cashFlowData[1].acquisitionsNet || 0) : 0;
    const totalAcqSpend = latestAcq + priorAcq;

    // Collect known deals from ALL available sources
    const knownDeals: { name: string; value?: string; date?: string }[] = [];
    const knownDealKeys = new Set<string>();

    function addDeal(name: string, date?: string, value?: string) {
      const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (key.length < 3 || knownDealKeys.has(key)) return;
      knownDealKeys.add(key);
      knownDeals.push({ name, date, value });
    }

    // Source 1: FMP M&A search data (try many field name variants)
    if (Array.isArray(maSearchData) && maSearchData.length > 0) {
      for (const deal of maSearchData.slice(0, 10)) {
        const name = deal.targetedCompanyName || deal.targetName || deal.target || deal.companyName;
        if (!name) continue;
        const date = deal.transactionDate || deal.date || deal.announcedDate;
        const value = deal.transactionValue ? `$${(deal.transactionValue / 1e6).toFixed(0)}M` : undefined;
        addDeal(name, date, value);
      }
    }

    // Source 2: News headlines — broad scan for acquisition-related activity
    if (Array.isArray(stockNewsData) && stockNewsData.length > 0) {
      const acqKeywords = /acqui|merger|merg(?:ing|ed)|purchase[ds]?\s+(?:of|the)|(?:buys?|bought)\s+[A-Z]/i;
      for (const n of stockNewsData) {
        const title = n.title || '';
        const text = n.text || '';
        const combined = `${title} ${text.slice(0, 200)}`;
        if (!acqKeywords.test(combined)) continue;
        const date = (n.publishedDate || n.date || '').split(' ')[0];

        // Try multiple extraction patterns on the title
        const patterns = [
          // "acquires Health Beacon" / "acquisition of Health Beacon"
          /(?:acquir(?:es?|ed|ing)|acquisition of|purchase[ds]?|buys?|bought|merger with|completes?\s+(?:the\s+)?(?:acquisition|purchase)\s+of)\s+([A-Z][A-Za-z][\w\s&.'',-]{1,50}?)(?:\s*[,.(]|\s+for\s+|\s+in\s+|\s+to\s+|$)/i,
          // "Health Beacon acquisition" (target before the keyword)
          /([A-Z][A-Za-z][\w\s&.'',-]{1,40}?)\s+acquisition\b/i,
        ];
        for (const pat of patterns) {
          const m = title.match(pat);
          if (m) {
            let targetName = m[1].trim().replace(/[.,;:]+$/, '').replace(/\s+(Inc|LLC|Ltd|Corp|Company|Co|Holdings?|Brands?)\.?$/i, '').trim();
            // Skip if it's just the company itself
            if (targetName.toLowerCase().includes(profile.companyName.split(' ')[0].toLowerCase())) continue;
            if (targetName.length > 2) {
              addDeal(targetName, date);
              break;
            }
          }
        }
      }
    }

    // Format the most recent deal date nicely (e.g., "March 2024")
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    function formatDealDate(dateStr?: string): string {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const monthIdx = parseInt(parts[1], 10) - 1;
        const month = MONTHS[monthIdx] || parts[1];
        return `${month} ${parts[0]}`;
      }
      return parts[0]; // just the year
    }

    // Sort deals by date descending (most recent first)
    knownDeals.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const mostRecent = knownDeals[0];

    let rating: string, acqDetail: string, obs: string;
    if (totalAcqSpend > 100_000_000) {
      rating = "Active Acquirer";
      acqDetail = `${formatCurrency(totalAcqSpend)} deployed in 2 years`;
      obs = "Demonstrated M&A appetite with significant capital deployed. The organization likely has deal infrastructure, integration playbooks, and experienced teams in place.";
    } else if (totalAcqSpend > 10_000_000) {
      rating = "Selective Buyer";
      acqDetail = `${formatCurrency(totalAcqSpend)} deployed in 2 years`;
      obs = "Selective acquisition approach — the company targets deals carefully. May need to expand integration capabilities for larger or more frequent transactions.";
    } else if (totalAcqSpend > 0) {
      rating = "Occasional Buyer";
      acqDetail = `${formatCurrency(totalAcqSpend)} in minor deals`;
      obs = "Limited recent M&A activity suggests an organic-first mindset.";
    } else {
      rating = "Organic-Focused";
      acqDetail = "No acquisitions in 2 years";
      obs = "No material acquisition activity detected in cash flow statements.";
    }

    // Always reference the most recent known deal when available
    if (mostRecent) {
      const dateStr = formatDealDate(mostRecent.date);
      const dealLine = dateStr
        ? `Last known M&A activity: ${mostRecent.name}${mostRecent.value ? ` (${mostRecent.value})` : ''} in ${dateStr}.`
        : `Last known M&A activity: ${mostRecent.name}${mostRecent.value ? ` (${mostRecent.value})` : ''}.`;
      obs += ` ${dealLine}`;

      if (knownDeals.length > 1) {
        const others = knownDeals.slice(1, 4).map(d => d.name).join(', ');
        obs += ` Other deals include ${others}.`;
      }

      if (rating === "Occasional Buyer" || rating === "Organic-Focused") {
        obs += " A strategic shift toward acquisitions would require building deal sourcing and integration capabilities.";
      }
    } else {
      // No deals found anywhere — add generic closing
      if (rating === "Occasional Buyer" || rating === "Organic-Focused") {
        obs += " A strategic shift toward acquisitions would require building deal sourcing and integration capabilities.";
      }
    }

    highlights.push({ label: "Acquisitiveness", value: rating, detail: acqDetail, observation: obs });
  }

  // ── Assemble all data sections into a single promptData string ──
  // This gets passed to generate-briefing (separate function) so the Claude API
  // call runs in its own function with its own 10s timeout budget.
  const promptData = `COMPANY PROFILE:
- Name: ${profile.companyName} (${profile.symbol})
- Market Cap: ${mcap}
- Share Price: $${profile.price.toFixed(2)}
- CEO: ${profile.ceo}
- Sector: ${profile.sector} — ${profile.industry}
- Employees: ${profile.fullTimeEmployees}
- Country: ${profile.country}
- Description: ${profile.description}
${financialsSection}${metricsSection}${segmentationSection}${analystSection}${competitiveLandscapeSection}${secFilingsSection}${maSection}${newsSection}${transcriptSection}`;

  return new Response(
    JSON.stringify({
      profile: {
        symbol: profile.symbol,
        companyName: profile.companyName,
        description: profile.description,
        marketCap: profile.marketCap,
        price: profile.price,
        sector: profile.sector,
        industry: profile.industry,
        ceo: profile.ceo,
        fullTimeEmployees: profile.fullTimeEmployees,
        website: profile.website,
        image: profile.image,
        country: profile.country,
      },
      highlights,
      revenueSegments,
      promptData,
      competitorProfiles: topCompetitors.map(c => ({
        symbol: c.symbol,
        name: c.name,
        marketCap: c.marketCap,
        industry: c.industry,
        productSegments: c.productSegments ?? [],
        isDirect: c.isDirect,
      })),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
