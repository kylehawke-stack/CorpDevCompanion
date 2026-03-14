import type { Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { cachedEnrichCompany, type CompanyEnrichment } from "./lib/fmpCache.js";

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

interface InvenCompany {
  name: string;
  url: string;
  desc: string;
  employees?: number | string;
  estimatedRevenue?: string;
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

export default async function handler(req: Request, _context: Context) {
  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const fmpKey = process.env.FMP_API_KEY;

  const body: RequestBody = await req.json();
  const { rankings, topStrategicPriorities, bottomStrategicPriorities, competitorProfiles, promptData, competitorPromptData } = body;

  const client = new Anthropic({ apiKey, baseURL: "https://api.anthropic.com" });

  // Build system message — use promptData (cached) when available
  const systemBlocks: Anthropic.Messages.TextBlockParam[] = [
    {
      type: "text" as const,
      text: `You are a senior M&A strategist advising on specific company acquisition targets for an M&A screening exercise.`,
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
${invenPool.map((c, i) => {
      let line = `${i + 1}. ${c.name} (${c.url})`;
      const meta: string[] = [];
      if (c.employees) meta.push(`~${c.employees} employees`);
      if (c.estimatedRevenue) meta.push(`Est. revenue: ${c.estimatedRevenue}`);
      if (meta.length > 0) line += ` [${meta.join(", ")}]`;
      line += `\n   ${c.desc}`;
      return line;
    }).join("\n")}

`;
  }

  // Build valid linkedTheme values
  const validThemes = rankings.slice(0, 10).map(r => r.title);
  const validThemesStr = validThemes.map(t => `"${t}"`).join(", ");

  const taskPrompt = `${prioritiesSection}${competitorSection}${invenSection}
Based on Step 2 voting results, the team has identified these strategic priorities:

Top-ranked market segments and product categories:
${topRankings}

ACQUISITION SIZING CONSTRAINT:
The acquirer's financial profile is in the system context above. Realistic acquisition targets should be in the $25M-$300M enterprise value range. Any target above $300M EV should be flagged in the blurb as a "stretch deal requiring significant leverage or equity." Do NOT suggest targets that would be larger than the acquirer itself.

STEP 1 — ANALYSIS (think through this before generating):
Review the top-ranked themes, the company's financial profile, the competitive landscape, and the Inven pool. In 3-5 sentences, identify:
- Which ranked themes suggest the most actionable acquisition targets?
- What company size range makes sense given the acquirer's resources?
- What gaps in the Inven pool should you fill with your own suggestions?

STEP 2 — GENERATE TARGETS:
Generate at least 35 SPECIFIC COMPANY acquisition targets that align with these top-ranked themes.
${invenPool.length > 0 ? `
INSTRUCTIONS FOR CANDIDATE POOL:
- Review ALL ${invenPool.length} companies in the INVEN.AI CANDIDATE POOL above
- Select 15-20 of the best fits from the pool AND generate 15-20 on your own
- You MUST generate at least 35 companies total
- Evaluate pool companies critically — don't include one just because it's listed
- For pool companies, write blurb bullets based on the description provided
- Mark each company with "fromPool": true if from the pool, "fromPool": false if your own suggestion

EVALUATION CRITERIA for pool companies:
1. Strategic fit with the top-ranked themes from Step 2
2. Likely acquisition size relative to the acquirer's resources
3. Whether the company fills a capability gap vs. simply adds revenue
4. Geographic and channel complementarity with the acquirer
` : `Generate at least 35 targets total.`}
Requirements:
- All companies must be REAL and potentially acquirable ($25M-$300M EV preferred)
- Include a mix: some obvious fits and 2-3 creative/contrarian picks
- Include at least 2 non-US or non-obvious international targets

BULLET FORMAT RULES (critical):
- "blurb" must be a JSON array of 3-5 strings
- The FIRST bullet must be a plain-English sentence a non-expert would understand
- Each bullet must be under 15 words — punchy, scannable
- Use **bold** markdown on the key phrase in important bullets (not every bullet)
- Focus on: strategic fit, key products, why it's a good target
- Do NOT include financial data in bullets (that's added separately)

EXAMPLE OF A COMPLETE GOOD ENTRY:
{
  "title": "Vitamix",
  "tier": "specific_company",
  "linkedTheme": "Premium Kitchen Appliances",
  "blurb": ["**Premium blender leader** trusted by chefs and home cooks alike", "Strong DTC channel with high margins and brand loyalty", "Complements existing kitchen portfolio with prestige positioning", "Would add professional/commercial channel access"],
  "fromPool": false
}

LINKEDTHEME RULES — CRITICAL:
Each company MUST include a "linkedTheme" field. You MUST use one of these exact strings (copy-paste, do not paraphrase):
${validThemesStr}
If a company doesn't fit any of these themes well, use the closest match.

Write your analysis first, then provide valid JSON:
{
  "ideas": [
    {
      "title": "Company Name",
      "tier": "specific_company",
      "linkedTheme": "exact theme title from list above",
      "blurb": ["Plain English first bullet", "**Bold key point** plus context", "Third short bullet"],
      "fromPool": false
    }
  ]
}`;

  // Build a lookup for Inven pool companies by name (for URL fallback)
  const invenByName = new Map<string, InvenCompany>();
  for (const c of invenPool) {
    invenByName.set(c.name.toLowerCase(), c);
  }

  try {
    console.log("[generate-company-ideas] Starting Claude API call...");
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
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
                cachedEnrichCompany(idea.title, fmpKey)
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
