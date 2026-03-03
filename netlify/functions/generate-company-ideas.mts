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
  topStrategicPriorities?: TopStrategicPriority[];
  bottomStrategicPriorities?: TopStrategicPriority[];
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
      `https://financialmodelingprep.com/stable/search-name?query=${encodeURIComponent(cleanName)}&apikey=${fmpKey}`
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
      `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(usResult.symbol)}&apikey=${fmpKey}`
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
  const { rankings, topStrategicPriorities, bottomStrategicPriorities, competitorProfiles, promptData, competitorPromptData } = body;

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
  } else {
    console.warn("[generate-company-ideas] WARNING: promptData not available — Claude will have limited company context");
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

  // Build strategic priorities section (top AND bottom from Step 1 voting)
  let prioritiesSection = "";
  if (topStrategicPriorities && topStrategicPriorities.length > 0) {
    prioritiesSection = `
TOP STRATEGIC PRIORITIES (ranked by team voting — the team's preferred directions):
${topStrategicPriorities.map(p => `${p.rank}. "${p.title}" (Score: ${p.score})`).join("\n")}

Use these strategic priorities as additional context when selecting company targets. Higher-ranked priorities should have more influence.
`;
    if (bottomStrategicPriorities && bottomStrategicPriorities.length > 0) {
      prioritiesSection += `
LOWEST-RANKED STRATEGIC PRIORITIES (the team voted AGAINST these — deprioritize):
${bottomStrategicPriorities.map(p => `${p.rank}. "${p.title}" (Score: ${p.score})`).join("\n")}

Avoid selecting company targets that primarily serve these low-ranked priorities.
`;
    }
  }

  // Build competitor context — CONTEXT ONLY, not the target company
  let competitorSection = "";
  if (competitorProfiles && competitorProfiles.length > 0) {
    competitorSection = `
COMPETITIVE LANDSCAPE (CONTEXT ONLY — these are competitors/peers, NOT the target company):
IMPORTANT: The competitor data below is provided purely as context and inspiration. It describes the competitive environment, NOT the company we are generating acquisition targets for. Do NOT confuse competitor financials, products, or strategies with the target company's own situation.

${competitorProfiles.map((c, i) => {
      const mcap = c.marketCap >= 1e9 ? `$${(c.marketCap / 1e9).toFixed(1)}B` : `$${(c.marketCap / 1e6).toFixed(0)}M`;
      let line = `${i + 1}. ${c.name} (${c.symbol}) — ${mcap} [${c.isDirect ? "Direct" : "Extended"} peer]`;
      if (c.productSegments.length > 0) line += `\n   Products: ${c.productSegments.join(", ")}`;
      return line;
    }).join("\n")}

Use these competitors to INSPIRE acquisition target ideas for the target company:
- Include 1-2 of these competitors themselves if they are acquirable (smaller market cap than the acquirer or reasonable bolt-on size)
- Include companies that SUPPLY or PARTNER with these competitors
- Include companies that compete with these competitors in niche segments
- Go 1 degree beyond — look at who serves the same END CUSTOMERS as these competitors
- Include at least 2 non-obvious targets that are NOT direct competitors — think adjacent, international, or emerging companies
`;
  }

  // Load the full Inven.ai candidate pool — send all companies to Claude unfiltered
  const invenPool = loadInvenPool();
  console.log(`[generate-company-ideas] Inven pool: ${invenPool.length} companies loaded (sending full list)`);

  let invenSection = "";
  if (invenPool.length > 0) {
    invenSection = `
INVEN.AI CANDIDATE POOL — Pre-screened acquisition targets (${invenPool.length} companies):
${invenPool.map((c, i) => `${i + 1}. ${c.name} (${c.url})\n   ${c.desc}`).join("\n")}

`;
  }

  const taskPrompt = `${prioritiesSection}${competitorSection}${invenSection}
Based on Step 2 voting results, the team has identified these strategic priorities:

Top-ranked market segments and product categories:
${topRankings}

Generate SPECIFIC COMPANY acquisition targets that align with these top-ranked themes.
${invenPool.length > 0 ? `
INSTRUCTIONS FOR CANDIDATE POOL:
- Review ALL ${invenPool.length} companies in the INVEN.AI CANDIDATE POOL above
- Select 10-12 of the best fits from the pool AND generate 8-10 on your own
- Evaluate pool companies critically — don't include one just because it's listed
- For pool companies, write blurb bullets based on the description provided
- Mark each company with "fromPool": true if from the pool, "fromPool": false if your own suggestion
` : `Generate 20 targets total.`}
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

  try {
    console.log("[generate-company-ideas] Starting Claude API call...");
    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      temperature: 0.8,
      system: systemBlocks,
      messages: [{ role: "user", content: taskPrompt }],
    });

    // Collect streamed text
    let text = "";
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        text += event.delta.text;
      }
    }
    console.log("[generate-company-ideas] Claude response received, length:", text.length);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[generate-company-ideas] No JSON found in response:", text.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response — no JSON found" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("[generate-company-ideas] JSON parse error:", parseErr);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response — invalid JSON" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
      return new Response(
        JSON.stringify({ error: "AI response missing 'ideas' array" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build a lookup for Inven pool companies by name (for URL fallback)
    const invenByName = new Map<string, InvenCompany>();
    for (const c of invenPool) {
      invenByName.set(c.name.toLowerCase(), c);
    }

    // Build ideas
    const rawIdeas = parsed.ideas.map(
      (idea: { title: string; tier: string; blurb: string | string[]; linkedTheme?: string; fromPool?: boolean }) => ({
        id: crypto.randomUUID(),
        title: idea.title,
        tier: "specific_company" as const,
        blurb: normalizeBlurb(idea.blurb),
        source: (idea.fromPool ? "inven_sourced" : "claude_injected") as "inven_sourced" | "claude_injected",
        createdAt: Date.now(),
        website: undefined as string | undefined,
        logoUrl: undefined as string | undefined,
        tags: [] as string[],
        linkedTheme: idea.linkedTheme,
        _fromPool: !!idea.fromPool,
      })
    );
    console.log("[generate-company-ideas] Parsed", rawIdeas.length, "ideas,", rawIdeas.filter((i: { _fromPool: boolean }) => i._fromPool).length, "from Inven pool");

    // Enrich companies with FMP data — limit to 10 at a time to avoid timeouts
    if (fmpKey) {
      const batch1 = rawIdeas.slice(0, 10);
      const batch2 = rawIdeas.slice(10);

      const enrichBatch = async (batch: typeof rawIdeas, startIdx: number) => {
        const enrichments = await Promise.allSettled(
          batch.map((idea: { title: string }) =>
            enrichCompany(idea.title, fmpKey)
          )
        );
        for (let i = 0; i < batch.length; i++) {
          const result = enrichments[i];
          if (result.status === "fulfilled" && result.value) {
            const data = result.value;
            rawIdeas[startIdx + i].tags = data.tags;
            rawIdeas[startIdx + i].website = data.website;
            rawIdeas[startIdx + i].logoUrl = data.logoUrl;
          }
        }
      };

      await enrichBatch(batch1, 0);
      if (batch2.length > 0) {
        await enrichBatch(batch2, 10);
      }
      console.log("[generate-company-ideas] FMP enrichment complete");
    }

    // Fallback enrichment for Inven-sourced companies where FMP returned nothing
    for (const idea of rawIdeas) {
      if (idea._fromPool && (!idea.tags || idea.tags.length === 0)) {
        const invenMatch = invenByName.get(idea.title.toLowerCase());
        if (invenMatch) {
          idea.website = invenMatch.url;
          idea.tags = ["Private", "Inven.ai sourced"];
        }
      }
    }

    // Clean up internal field before sending response
    const cleanedIdeas = rawIdeas.map(({ _fromPool, ...rest }: { _fromPool: boolean; [key: string]: unknown }) => rest);

    return new Response(JSON.stringify({ ideas: cleanedIdeas }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
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
