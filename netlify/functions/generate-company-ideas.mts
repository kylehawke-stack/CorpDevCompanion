import type { Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

interface RankingSummary {
  title: string;
  tier: string;
  score: number;
  wins: number;
  losses: number;
}

interface TopStrategicPriority {
  title: string;
  score: number;
  rank: number;
}

interface CompetitorInfo {
  symbol: string;
  name: string;
  marketCap: number;
  industry: string;
  productSegments: string[];
  isDirect: boolean;
}

interface RequestBody {
  rankings: RankingSummary[];
  strategicContext?: {
    freeText?: string;
    earningsTranscript?: string;
    analystNotes?: string;
  };
  topStrategicPriorities?: TopStrategicPriority[];
  competitorProfiles?: CompetitorInfo[];
  promptData?: string;
  competitorPromptData?: string;
}

interface FmpProfile {
  symbol: string;
  companyName: string;
  marketCap: number;
  price: number;
  sector: string;
  industry: string;
  country: string;
  fullTimeEmployees: string;
  description: string;
  website: string;
  image: string;
}

interface FmpSearchResult {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
}

interface CompanyEnrichment {
  tags: string[];
  website?: string;
  logoUrl?: string;
}

interface InvenCompany {
  name: string;
  url: string;
  desc: string;
}

/**
 * Load the static Inven.ai company pool from disk.
 */
function loadInvenPool(): InvenCompany[] {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const data = readFileSync(join(__dirname, "data", "inven-companies.json"), "utf-8");
    return JSON.parse(data);
  } catch {
    console.warn("[generate-company-ideas] Could not load inven-companies.json");
    return [];
  }
}

/**
 * Keyword-based pre-filtering of Inven pool using Step 2 ranking titles.
 * Scores each company by keyword matches in name + desc, returns top N.
 */
function filterInvenPool(
  allCompanies: InvenCompany[],
  rankings: RankingSummary[],
  maxResults = 35
): InvenCompany[] {
  // Extract keywords from top 10 ranking titles
  const stopWords = new Set([
    "and", "the", "for", "with", "from", "into", "that", "this", "are",
    "was", "has", "have", "been", "will", "can", "its", "their", "our",
    "all", "but", "not", "also", "more", "other", "such", "than", "very",
  ]);
  const keywords: string[] = [];
  for (const r of rankings.slice(0, 10)) {
    const words = r.title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
    keywords.push(...words);
  }
  const keywordSet = new Set(keywords);
  if (keywordSet.size === 0) return allCompanies.slice(0, maxResults);

  // Score each company
  const scored = allCompanies.map((c) => {
    const text = `${c.name} ${c.desc}`.toLowerCase();
    let score = 0;
    for (const kw of keywordSet) {
      // Count occurrences
      const regex = new RegExp(`\\b${kw}`, "gi");
      const matches = text.match(regex);
      if (matches) score += matches.length;
    }
    return { company: c, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Take top results; if fewer than 15 match, pad with random sample
  const matched = scored.filter((s) => s.score > 0);
  if (matched.length >= maxResults) {
    return matched.slice(0, maxResults).map((s) => s.company);
  }

  const result = matched.map((s) => s.company);
  if (result.length < 15) {
    const used = new Set(result.map((c) => c.name));
    const unmatched = allCompanies.filter((c) => !used.has(c.name));
    // Shuffle and pad
    for (let i = unmatched.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unmatched[i], unmatched[j]] = [unmatched[j], unmatched[i]];
    }
    const needed = Math.min(maxResults - result.length, unmatched.length);
    result.push(...unmatched.slice(0, needed));
  }

  return result.slice(0, maxResults);
}

/**
 * Normalize blurb: if Claude returns a string, split into sentences as bullets.
 */
function normalizeBlurb(blurb: string | string[]): string[] {
  if (Array.isArray(blurb)) {
    return blurb.length > 0 ? blurb : ["No details provided"];
  }
  const sentences = blurb
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return sentences.length > 0 ? sentences : [blurb];
}

function formatMarketCap(mc: number): string {
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(1)}B`;
  return `$${(mc / 1e6).toFixed(0)}M`;
}

/**
 * Fetch acquirer's financial profile from FMP.
 */
async function fetchAcquirerProfile(
  fmpKey: string
): Promise<FmpProfile | null> {
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/profile?symbol=HBB&apikey=${fmpKey}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

/**
 * Search FMP for a company by name and return structured enrichment data.
 * Uses fuzzy name matching with validation to avoid wrong-entity matches.
 */
async function enrichCompany(
  companyName: string,
  fmpKey: string
): Promise<CompanyEnrichment | null> {
  try {
    const cleanName = companyName
      .replace(
        /\s*(Inc\.?|Corp\.?|Corporation|LLC|Ltd\.?|Holdings?|Co\.?|Group|Brands?|Company)\s*$/i,
        ""
      )
      .trim();
    const searchRes = await fetch(
      `https://financialmodelingprep.com/stable/search-name?query=${encodeURIComponent(cleanName)}&apikey=${fmpKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!searchRes.ok) return null;
    const results: FmpSearchResult[] = await searchRes.json();
    if (!results || results.length === 0) return null;

    // Prefer US exchanges
    const usResult =
      results.find(
        (r) =>
          r.exchange === "NYSE" ||
          r.exchange === "NASDAQ" ||
          r.exchange === "AMEX"
      ) ?? results[0];

    // Validate: the matched name should share significant words with the search query
    const queryWords = new Set(cleanName.toLowerCase().split(/\s+/));
    const matchWords = usResult.name.toLowerCase().split(/\s+/);
    const overlap = matchWords.filter(w => queryWords.has(w)).length;
    if (overlap === 0 && cleanName.length > 4) return null; // No word overlap = likely wrong entity

    const profileRes = await fetch(
      `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(usResult.symbol)}&apikey=${fmpKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!profileRes.ok) return null;
    const profiles = await profileRes.json();
    if (!Array.isArray(profiles) || profiles.length === 0) return null;

    const p = profiles[0] as FmpProfile;

    // Sanity check: skip obviously wrong matches (e.g. $2M market cap for a major company)
    if (p.marketCap && p.marketCap < 5_000_000) return null;

    const tags: string[] = [];

    if (p.marketCap) {
      tags.push(`Mkt Cap: ${formatMarketCap(p.marketCap)}`);
    }
    if (p.fullTimeEmployees && Number(p.fullTimeEmployees) > 100) {
      tags.push(
        `${Number(p.fullTimeEmployees).toLocaleString()} employees`
      );
    }
    if (p.sector) {
      tags.push(p.industry || p.sector);
    }

    return {
      tags,
      website: p.website || undefined,
      logoUrl: p.image || undefined,
    };
  } catch {
    return null;
  }
}

export default async function handler(req: Request, _context: Context) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fmpKey = process.env.FMP_API_KEY;

  const body: RequestBody = await req.json();
  const { rankings, strategicContext, topStrategicPriorities, competitorProfiles, promptData, competitorPromptData } = body;

  const client = new Anthropic({ apiKey });

  // Build system message — use promptData (cached) when available
  const systemBlocks: Anthropic.Messages.TextBlockParam[] = [
    {
      type: "text" as const,
      text: "You are a senior M&A strategist advising Hamilton Beach Brands (NYSE: HBB) on specific company acquisition targets.",
    },
  ];

  if (promptData) {
    systemBlocks.push({
      type: "text" as const,
      text: promptData,
      // @ts-expect-error — cache_control is supported by the API but not fully typed in all SDK versions
      cache_control: competitorPromptData ? undefined : { type: "ephemeral" },
    });
  } else if (fmpKey) {
    // Fallback: fetch basic acquirer profile
    const profile = await fetchAcquirerProfile(fmpKey);
    if (profile) {
      const mcap = formatMarketCap(profile.marketCap);
      systemBlocks.push({
        type: "text" as const,
        text: `ACQUIRER FINANCIAL PROFILE:\n- Company: ${profile.companyName} (${profile.symbol})\n- Market Cap: ${mcap}\n- Share Price: $${profile.price.toFixed(2)}\n- Sector: ${profile.sector} — ${profile.industry}\n- Employees: ${Number(profile.fullTimeEmployees).toLocaleString()}\n\nACQUISITION SIZING CONSTRAINT: With a ${mcap} market cap, target companies valued at roughly $25M-$250M.`,
      });
    }
  }

  // Block 3: Competitor financial profiles (cached)
  if (competitorPromptData) {
    systemBlocks.push({
      type: "text" as const,
      text: competitorPromptData,
      // @ts-expect-error — cache_control is supported by the API but not fully typed in all SDK versions
      cache_control: { type: "ephemeral" },
    });
  }

  const topRankings = rankings
    .slice(0, 10)
    .map(
      (r, i) =>
        `${i + 1}. [${r.tier}] "${r.title}" — Score: ${r.score}, W-L: ${r.wins}-${r.losses}`
    )
    .join("\n");

  // Build strategic priorities section
  let prioritiesSection = "";
  if (topStrategicPriorities && topStrategicPriorities.length > 0) {
    prioritiesSection = `
Top Strategic Priorities (from Step 1 team voting):
${topStrategicPriorities.map(p => `${p.rank}. "${p.title}" (Score: ${p.score})`).join("\n")}

Use these strategic priorities as additional context when selecting company targets. Higher-ranked priorities should have more influence.
`;
  }

  // Build strategic context section
  let contextSection = "";
  if (strategicContext) {
    const parts: string[] = [];
    if (strategicContext.freeText?.trim()) {
      parts.push(`Strategic Priorities:\n${strategicContext.freeText.trim()}`);
    }
    if (strategicContext.earningsTranscript?.trim()) {
      parts.push(
        `Recent Earnings Call Highlights:\n${strategicContext.earningsTranscript.trim()}`
      );
    }
    if (strategicContext.analystNotes?.trim()) {
      parts.push(
        `Analyst Reports & Industry Notes:\n${strategicContext.analystNotes.trim()}`
      );
    }
    if (parts.length > 0) {
      contextSection = `\nAdditional strategic context from the team:\n${parts.join("\n\n")}\n\nUse this context to identify companies that align with stated priorities.\n`;
    }
  }

  // Build competitor context for company idea generation
  let competitorSection = "";
  if (competitorProfiles && competitorProfiles.length > 0) {
    competitorSection = `
KNOWN COMPETITORS & THEIR ECOSYSTEMS:
${competitorProfiles.map((c, i) => {
      const mcap = c.marketCap >= 1e9 ? `$${(c.marketCap / 1e9).toFixed(1)}B` : `$${(c.marketCap / 1e6).toFixed(0)}M`;
      let line = `${i + 1}. ${c.name} (${c.symbol}) — ${mcap} [${c.isDirect ? "Direct" : "Extended"} peer]`;
      if (c.productSegments.length > 0) line += `\n   Products: ${c.productSegments.join(", ")}`;
      return line;
    }).join("\n")}

IMPORTANT: Use these competitors as a STARTING POINT, not the entire universe:
- Include 1-2 of these competitors themselves if they are acquirable (smaller market cap than the acquirer or reasonable bolt-on size)
- Include companies that SUPPLY or PARTNER with these competitors
- Include companies that compete with these competitors in niche segments
- Go 1 degree beyond — look at who serves the same END CUSTOMERS as these competitors
- Include at least 2 non-obvious targets that are NOT direct competitors — think adjacent, international, or emerging companies
`;
  }

  // Load and filter Inven.ai candidate pool
  const invenPool = loadInvenPool();
  const filteredPool = invenPool.length > 0 ? filterInvenPool(invenPool, rankings) : [];
  console.log(`[generate-company-ideas] Inven pool: ${invenPool.length} total, ${filteredPool.length} filtered`);

  let invenSection = "";
  if (filteredPool.length > 0) {
    invenSection = `
INVEN.AI CANDIDATE POOL — Pre-screened acquisition targets:
${filteredPool.map((c, i) => `${i + 1}. ${c.name} (${c.url})\n   ${c.desc}`).join("\n")}

`;
  }

  const taskPrompt = `${prioritiesSection}${competitorSection}${invenSection}
Based on Step 2 voting results, the team has identified these strategic priorities:

Top-ranked market segments and product categories:
${topRankings}
${contextSection}
Generate at least 35 SPECIFIC COMPANY acquisition targets that align with these top-ranked themes.
${filteredPool.length > 0 ? `
INSTRUCTIONS FOR CANDIDATE POOL:
- Select 15-20 of the best fits from the INVEN.AI CANDIDATE POOL above AND generate 15-20 on your own
- You MUST generate at least 35 companies total
- Evaluate pool companies critically — don't include one just because it's listed
- For pool companies, write blurb bullets based on the description provided
- Mark each company with "fromPool": true if from the pool, "fromPool": false if your own suggestion
` : `Generate at least 35 targets total.`}
Requirements:
- All companies must be REAL and potentially acquirable
- Keep targets realistically sized for this acquirer
- Include a mix: some obvious fits and 1-2 creative/contrarian picks

BULLET FORMAT RULES (critical):
- "blurb" must be a JSON array of 3-5 strings
- Each bullet must be under 15 words — punchy, scannable
- Use **bold** markdown on the key phrase in important bullets (not every bullet)
- Focus on: strategic fit, key products, why it's a good target
- Do NOT include financial data in bullets (that's added separately)
- Do NOT write paragraph-style sentences

Example of GOOD bullets:
["**Premium blender leader** in professional/home markets", "Strong DTC channel with 40%+ margins", "Complements HBB's existing kitchen portfolio", "Brand loyalty comparable to KitchenAid"]

Example of BAD bullets (too long, no bold):
["This company is a leading manufacturer of premium blenders that has built a strong direct-to-consumer channel with margins exceeding 40 percent"]

Each company MUST include a "linkedTheme" field — the market segment or product category from the Step 2 rankings above that this company best aligns with. Use the exact title from the rankings.

Return ONLY valid JSON:
{
  "ideas": [
    {
      "title": "Company Name",
      "tier": "specific_company",
      "linkedTheme": "Market Segment or Product Category from rankings",
      "blurb": ["**Bold key point** plus context", "Second short bullet", "Third short bullet"],
      "fromPool": false
    }
  ]
}`;

  // Build a lookup for Inven pool companies by name (for URL fallback)
  const invenByName = new Map<string, InvenCompany>();
  for (const c of filteredPool) {
    invenByName.set(c.name.toLowerCase(), c);
  }

  try {
    console.log("[generate-company-ideas] Starting Claude API call...");
    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 10000,
      temperature: 0.8,
      system: systemBlocks,
      messages: [{ role: "user", content: taskPrompt }],
    });

    // Stream the response — handler returns immediately, avoiding lambda-local timeout
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Phase 1: Stream Claude's text chunks to client
          let text = "";
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              text += event.delta.text;
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          console.log("[generate-company-ideas] Claude response received, length:", text.length);

          // Phase 2: Parse Claude's response and do FMP enrichment
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            console.error("[generate-company-ideas] No JSON found in response:", text.slice(0, 500));
            controller.enqueue(encoder.encode("\n\n__ERROR__\nNo JSON found in AI response"));
            controller.close();
            return;
          }

          let parsed;
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {
            controller.enqueue(encoder.encode("\n\n__ERROR__\nFailed to parse AI response JSON"));
            controller.close();
            return;
          }

          if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
            controller.enqueue(encoder.encode("\n\n__ERROR__\nAI response missing ideas array"));
            controller.close();
            return;
          }

          console.log("[generate-company-ideas] Parsed", parsed.ideas.length, "ideas, enriching...");

          // FMP enrichment — all in parallel, each call has a 5s timeout
          const enrichmentMap: Record<string, CompanyEnrichment> = {};
          if (fmpKey) {
            const enrichments = await Promise.allSettled(
              parsed.ideas.map((idea: { title: string }) =>
                enrichCompany(idea.title, fmpKey)
              )
            );
            for (let i = 0; i < parsed.ideas.length; i++) {
              const result = enrichments[i];
              if (result.status === "fulfilled" && result.value) {
                enrichmentMap[parsed.ideas[i].title] = result.value;
              }
            }
            console.log("[generate-company-ideas] FMP enrichment complete");
          }

          // Fallback enrichment for Inven-sourced companies where FMP returned nothing
          for (const idea of parsed.ideas) {
            if (idea.fromPool && !enrichmentMap[idea.title]) {
              const invenMatch = invenByName.get(idea.title.toLowerCase());
              if (invenMatch) {
                enrichmentMap[idea.title] = {
                  tags: ["Private", "Inven.ai sourced"],
                  website: invenMatch.url,
                };
              }
            }
          }

          // Send enrichment data after delimiter
          controller.enqueue(encoder.encode("\n\n__ENRICHMENT__\n" + JSON.stringify(enrichmentMap)));
          controller.close();
        } catch (err) {
          console.error("[generate-company-ideas] Stream error:", err);
          controller.enqueue(
            encoder.encode("\n\n__ERROR__\n" + (err instanceof Error ? err.message : "Unknown error"))
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Accel-Buffering": "no",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-company-ideas] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
