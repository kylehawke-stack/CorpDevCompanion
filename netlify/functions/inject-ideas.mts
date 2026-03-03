import type { Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

function normalizeBlurb(blurb: string | string[]): string[] {
  if (Array.isArray(blurb)) return blurb.length > 0 ? blurb : ["No details provided"];
  const sentences = blurb.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
  return sentences.length > 0 ? sentences : [blurb];
}

interface FmpProfile {
  symbol: string;
  companyName: string;
  marketCap: number;
  fullTimeEmployees: string;
  sector: string;
  industry: string;
  website: string;
  image: string;
}

interface FmpSearchResult {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
}

function formatMarketCap(mc: number): string {
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(1)}B`;
  return `$${(mc / 1e6).toFixed(0)}M`;
}

async function enrichCompany(
  companyName: string,
  fmpKey: string
): Promise<{ tags: string[]; website?: string; logoUrl?: string } | null> {
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

    const usResult =
      results.find(
        (r) =>
          r.exchange === "NYSE" ||
          r.exchange === "NASDAQ" ||
          r.exchange === "AMEX"
      ) ?? results[0];

    const queryWords = new Set(cleanName.toLowerCase().split(/\s+/));
    const matchWords = usResult.name.toLowerCase().split(/\s+/);
    const overlap = matchWords.filter((w) => queryWords.has(w)).length;
    if (overlap === 0 && cleanName.length > 4) return null;

    const profileRes = await fetch(
      `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(usResult.symbol)}&apikey=${fmpKey}`
    );
    if (!profileRes.ok) return null;
    const profiles = await profileRes.json();
    if (!Array.isArray(profiles) || profiles.length === 0) return null;

    const p = profiles[0] as FmpProfile;
    if (p.marketCap && p.marketCap < 5_000_000) return null;

    const tags: string[] = [];
    if (p.marketCap) tags.push(`Mkt Cap: ${formatMarketCap(p.marketCap)}`);
    if (p.fullTimeEmployees && Number(p.fullTimeEmployees) > 100) {
      tags.push(`${Number(p.fullTimeEmployees).toLocaleString()} employees`);
    }
    if (p.sector) tags.push(p.industry || p.sector);

    return {
      tags,
      website: p.website || undefined,
      logoUrl: p.image || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Normalize a title for fuzzy comparison: lowercase, strip punctuation, collapse whitespace.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if two titles are near-duplicates using word-level Jaccard similarity.
 * Returns true if similarity >= threshold (default 0.7).
 */
function isSimilar(a: string, b: string, threshold = 0.7): boolean {
  const wordsA = new Set(normalizeTitle(a).split(" "));
  const wordsB = new Set(normalizeTitle(b).split(" "));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  if (union === 0) return false;
  return intersection / union >= threshold;
}

interface InvenCompany {
  name: string;
  url: string;
  desc: string;
}

function loadInvenPool(): InvenCompany[] {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const data = readFileSync(join(__dirname, "data", "inven-companies.json"), "utf-8");
    return JSON.parse(data);
  } catch {
    console.warn("[inject-ideas] Could not load inven-companies.json");
    return [];
  }
}

interface RankingSummary {
  title: string;
  tier: string;
  blurb?: string[];
  score: number;
  wins: number;
  losses: number;
  source?: string;
}

interface InjectedPerformance {
  title: string;
  tier: string;
  score: number;
  wins: number;
  losses: number;
  rank: number;
}

interface CompanyProfile {
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
  totalVotes: number;
  existingTitles: string[];
  votingStep?: "step1" | "step2" | "step3";
  companyProfile?: CompanyProfile;
  topStrategicPriorities?: TopStrategicPriority[];
  bottomStrategicPriorities?: TopStrategicPriority[];
  injectedPerformance?: InjectedPerformance[];
  lastInjectionAtVoteCount?: number;
  userDirections?: string[];
  competitorProfiles?: CompetitorInfo[];
  promptData?: string;
  competitorPromptData?: string;
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
  const {
    rankings,
    totalVotes,
    existingTitles,
    votingStep,
    companyProfile,
    topStrategicPriorities,
    bottomStrategicPriorities,
    injectedPerformance,
    lastInjectionAtVoteCount,
    userDirections,
    competitorProfiles,
    promptData,
    competitorPromptData,
  } = body;

  const client = new Anthropic({ apiKey });

  // Build system message — use promptData (cached) when available
  const systemBlocks: Anthropic.Messages.TextBlockParam[] = [
    {
      type: "text" as const,
      text: "You are an M&A strategist generating new ideas to inject into an active pairwise voting session.",
    },
  ];

  if (promptData) {
    systemBlocks.push({
      type: "text" as const,
      text: promptData,
      // @ts-expect-error — cache_control is supported by the API but not fully typed in all SDK versions
      cache_control: competitorPromptData ? undefined : { type: "ephemeral" },
    });
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

  // Determine tier weighting based on voting step
  let tierGuidance: string;
  if (votingStep === "step1") {
    tierGuidance =
      "Generate ONLY strategic_priority ideas. These are PURE STRATEGIC FRAMEWORK choices — they define the HOW and WHY of M&A, not specific products, markets, or industries. They fall into dimensions like: growth objective (e.g., 'Geographic Expansion', 'Category Extension'), target profile (e.g., 'Manufacturing Capability', 'Established Brands'), deal risk posture (e.g., 'Bolt-On Adjacencies', 'Transformational Bets'), integration approach (e.g., 'Full Integration', 'Standalone Brands'), capability priority (e.g., 'IP & Patents', 'Distribution Network'), or strategic proximity (e.g., 'Core Strengthening', 'Adjacent Categories', 'White Space Diversification'). Titles must be 2-4 words. Do NOT reference specific product categories, market segments, or end-markets in titles.";
  } else if (votingStep === "step3") {
    tierGuidance =
      'Generate ONLY specific_company ideas (2-3). All companies must be REAL and potentially acquirable ($25M-$500M revenue). Include non-obvious and international targets — go beyond the obvious competitors. Think about suppliers, distributors, technology providers, and adjacent-category leaders that most people wouldn\'t immediately consider. Each company MUST include a "linkedTheme" field — the market segment or product category from the rankings that it best aligns with.';
  } else {
    // Step 2: only market segments and product categories
    if (totalVotes <= 30) {
      tierGuidance =
        "Focus mostly on Market Segments (2) with maybe 1 Product Category. Do NOT generate Specific Company ideas.";
    } else {
      tierGuidance =
        "Focus on Product Categories (2) with maybe 1 Market Segment. Do NOT generate Specific Company ideas.";
    }
  }



  // Build company profile section (fallback when promptData not available)
  let companySection = "";
  if (!promptData && companyProfile) {
    companySection = `Company Profile:
- ${companyProfile.companyName} (${companyProfile.symbol})
- Sector: ${companyProfile.sector} | Industry: ${companyProfile.industry}
- Market Cap: $${(companyProfile.marketCap / 1e9).toFixed(2)}B | CEO: ${companyProfile.ceo}
- ${companyProfile.fullTimeEmployees} employees | ${companyProfile.country}
- ${companyProfile.description.slice(0, 400)}`;
  }

  // Build strategic priorities section (top AND bottom from Step 1 voting)
  let prioritiesSection = "";
  if (topStrategicPriorities && topStrategicPriorities.length > 0) {
    prioritiesSection = `\nTOP STRATEGIC PRIORITIES (ranked by team voting — the team's preferred directions):\n${topStrategicPriorities.map((p) => `${p.rank}. "${p.title}" (Score: ${p.score})`).join("\n")}\nAlign new ideas with these priorities. Higher-ranked priorities should have more influence.\n`;
    if (bottomStrategicPriorities && bottomStrategicPriorities.length > 0) {
      prioritiesSection += `\nLOWEST-RANKED STRATEGIC PRIORITIES (the team voted AGAINST these — deprioritize):\n${bottomStrategicPriorities.map((p) => `${p.rank}. "${p.title}" (Score: ${p.score})`).join("\n")}\nAvoid generating ideas that primarily serve these low-ranked priorities unless there is a compelling contrarian reason.\n`;
    }
  }

  // Build rankings with blurbs
  const topRankings = rankings
    .slice(0, 10)
    .map(
      (r, i) =>
        `${i + 1}. [${r.tier}] "${r.title}" (Score: ${r.score}, W-L: ${r.wins}-${r.losses})${r.blurb ? "\n   " + r.blurb.slice(0, 2).join("; ") : ""}`
    )
    .join("\n");

  const bottomRankings = rankings
    .slice(-5)
    .map(
      (r, i) =>
        `${rankings.length - 4 + i}. [${r.tier}] "${r.title}" (Score: ${r.score}, W-L: ${r.wins}-${r.losses})${r.blurb ? "\n   " + r.blurb.slice(0, 2).join("; ") : ""}`
    )
    .join("\n");

  // Build injection performance feedback
  let injectionFeedback = "";
  if (injectedPerformance && injectedPerformance.length > 0) {
    const votesSinceLastInjection = lastInjectionAtVoteCount
      ? totalVotes - lastInjectionAtVoteCount
      : totalVotes;
    injectionFeedback = `\nPreviously injected idea performance (${votesSinceLastInjection} votes since last injection):
${injectedPerformance
  .map(
    (p) =>
      `- "${p.title}" [${p.tier}] → Rank #${p.rank}, Score: ${p.score}, W-L: ${p.wins}-${p.losses}`
  )
  .join("\n")}
Use this feedback: generate more ideas like high-performers, avoid patterns from low-performers.\n`;
  }

  // Build user directions section (heavyweight — these are real-time steering from the team)
  let directionsSection = "";
  if (userDirections && userDirections.length > 0) {
    directionsSection = `\n**IMPORTANT — EXECUTIVE DIRECTION (highest priority):**
The team has provided the following real-time guidance during voting. These directions MUST heavily influence your idea generation — they override general patterns:
${userDirections.map((d, i) => `${i + 1}. "${d}"`).join("\n")}

Follow these directions closely. If they say "focus more on X", generate ideas in that direction. If they say "focus less on Y", avoid that area entirely.\n`;
  }

  // Build competitor context for injection — CONTEXT ONLY, not the target company
  let competitorSection = "";
  if (competitorProfiles && competitorProfiles.length > 0) {
    const relevantCompetitors = competitorProfiles.slice(0, 5);
    competitorSection = `\nCOMPETITIVE LANDSCAPE (CONTEXT ONLY — these are competitors/peers, NOT the target company):\n`;
    competitorSection += `Key competitors: ${relevantCompetitors.map(c => `${c.name} (${c.symbol})`).join(", ")}`;
    if (votingStep === "step3") {
      competitorSection += `\nCompetitor product segments: ${relevantCompetitors.flatMap(c => c.productSegments).filter(Boolean).slice(0, 10).join(", ")}`;
      competitorSection += `\nUse this to INSPIRE ideas for the target company — find non-obvious targets that supply, partner with, or operate adjacent to these competitors. Do NOT confuse competitor data with the target company's own situation.\n`;
    }
  }

  // For Step 3, load full Inven pool and exclude already-used companies
  let invenSection = "";
  const invenPool = votingStep === "step3" ? loadInvenPool() : [];
  if (invenPool.length > 0) {
    const existingLower = new Set(existingTitles.map((t) => t.toLowerCase()));
    const invenRemaining = invenPool.filter((c) => {
      if (existingLower.has(c.name.toLowerCase())) return false;
      if (existingTitles.some((t) => isSimilar(c.name, t))) return false;
      return true;
    });
    console.log(`[inject-ideas] Inven pool: ${invenPool.length} total, ${invenRemaining.length} not yet used`);

    if (invenRemaining.length > 0) {
      invenSection = `
INVEN.AI CANDIDATE POOL — Pre-screened acquisition targets not yet in voting (${invenRemaining.length} companies):
${invenRemaining.map((c, i) => `${i + 1}. ${c.name} (${c.url})\n   ${c.desc}`).join("\n")}
Consider 1-2 of these if they align with voting trends. Mark them with "fromPool": true.
`;
    }
  }

  const prompt = `${companySection}

Based on voting patterns, generate 2-3 NEW acquisition target ideas.
${prioritiesSection}${competitorSection}${directionsSection}${injectionFeedback}${invenSection}
Current top-ranked opportunities:
${topRankings}

Current bottom-ranked:
${bottomRankings}

Total votes cast: ${totalVotes}

Existing ideas (do NOT duplicate these, not even paraphrases or near-duplicates): ${existingTitles.join(", ")}

DEDUP RULE — READ CAREFULLY:
Before generating ANY idea, mentally check it against EVERY existing idea above. Do NOT generate ideas that are:
- The same concept with different wording (e.g., "Commercial Food Service Equipment" vs "Commercial Foodservice Equipment")
- A subset of an existing idea (e.g., "Coffee Machines" when "Beverage Equipment" already exists)
- A superset that subsumes an existing idea
- The same company/segment described from a different angle
Each new idea must represent a genuinely DISTINCT concept that is not already covered.

${tierGuidance}

STEP 1 — Brief analysis (2-3 sentences):
What patterns do the top-ranked and bottom-ranked ideas reveal? What gap or opportunity is NOT yet represented?

STEP 2 — Generate ideas:
- Generate ideas that EXPLORE the themes revealed by top-ranked items
- Align with the company profile and strategic priorities
- Include ONE contrarian/surprising idea that challenges the revealed preferences
- Ideas should be specific and actionable
BULLET FORMAT RULES (critical):
- "blurb" must be a JSON array of 3-5 strings
- Each bullet must be under 15 words — punchy, scannable
- Use **bold** markdown on the key phrase in important bullets (not every bullet)

Return ONLY valid JSON:
{
  "ideas": [
    {
      "title": "string",
      "tier": "strategic_priority" | "market_segment" | "product_category" | "specific_company",
      "blurb": ["**Bold key point** plus context", "Second short bullet", "Third short bullet"],
      "linkedTheme": "only for specific_company tier — the market segment or product category it aligns with",
      "fromPool": false
    }
  ]
}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      temperature: 0.8,
      system: systemBlocks,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const ideas = parsed.ideas.map(
      (idea: { title: string; tier: string; blurb: string | string[]; linkedTheme?: string; fromPool?: boolean }) => ({
        id: crypto.randomUUID(),
        title: idea.title,
        tier: idea.tier,
        blurb: normalizeBlurb(idea.blurb),
        source: idea.fromPool ? "inven_sourced" : "claude_injected",
        createdAt: Date.now(),
        linkedTheme: idea.linkedTheme,
        tags: [] as string[],
        website: undefined as string | undefined,
        logoUrl: undefined as string | undefined,
        _fromPool: !!idea.fromPool,
      })
    );

    // Filter out near-duplicates of existing ideas
    const dedupedIdeas = ideas.filter((newIdea: { title: string }) => {
      return !existingTitles.some((existing) => isSimilar(newIdea.title, existing));
    });

    // Replace ideas array with deduped version
    ideas.length = 0;
    ideas.push(...dedupedIdeas);

    // Enrich Step 3 company ideas with FMP data
    if (fmpKey && votingStep === "step3") {
      const enrichments = await Promise.allSettled(
        ideas
          .filter((i: { tier: string }) => i.tier === "specific_company")
          .map((i: { title: string }) => enrichCompany(i.title, fmpKey))
      );
      let enrichIdx = 0;
      for (const idea of ideas) {
        if (idea.tier === "specific_company") {
          const result = enrichments[enrichIdx++];
          if (result.status === "fulfilled" && result.value) {
            idea.tags = result.value.tags;
            idea.website = result.value.website;
            idea.logoUrl = result.value.logoUrl;
          }
        }
      }
    }

    // Fallback enrichment for Inven-sourced private companies
    if (invenPool.length > 0) {
      const invenByName = new Map<string, InvenCompany>();
      for (const c of invenPool) {
        invenByName.set(c.name.toLowerCase(), c);
      }
      for (const idea of ideas) {
        if (idea._fromPool && (!idea.tags || idea.tags.length === 0)) {
          const match = invenByName.get(idea.title.toLowerCase());
          if (match) {
            idea.website = match.url;
            idea.tags = ["Private", "Inven.ai sourced"];
          }
        }
      }
    }

    // Clean up internal field
    const cleanedIdeas = ideas.map(({ _fromPool, ...rest }: { _fromPool: boolean; [key: string]: unknown }) => rest);

    return new Response(JSON.stringify({ ideas: cleanedIdeas }), {
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
