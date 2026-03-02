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
  strategicContext?: {
    freeText?: string;
    earningsTranscript?: string;
    analystNotes?: string;
  };
  companyProfile?: CompanyProfile;
  topStrategicPriorities?: TopStrategicPriority[];
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
    strategicContext,
    companyProfile,
    topStrategicPriorities,
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
      contextSection = `\nAdditional strategic context:\n${parts.join("\n\n")}\n`;
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

  // Build strategic priorities section
  let prioritiesSection = "";
  if (topStrategicPriorities && topStrategicPriorities.length > 0) {
    prioritiesSection = `\nTop Strategic Priorities (from Step 1 voting):\n${topStrategicPriorities.map((p) => `${p.rank}. "${p.title}" (Score: ${p.score})`).join("\n")}\nAlign new ideas with these priorities.\n`;
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
    injectionFeedback = `\nPrevious AI-injected idea performance (${votesSinceLastInjection} votes since last injection):
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

  // Build competitor context for injection
  let competitorSection = "";
  if (competitorProfiles && competitorProfiles.length > 0) {
    const relevantCompetitors = competitorProfiles.slice(0, 5);
    competitorSection = `\nKey competitors: ${relevantCompetitors.map(c => `${c.name} (${c.symbol})`).join(", ")}`;
    if (votingStep === "step3") {
      competitorSection += `\nCompetitor product segments: ${relevantCompetitors.flatMap(c => c.productSegments).filter(Boolean).slice(0, 10).join(", ")}`;
      competitorSection += `\nUse this to find non-obvious targets: companies that supply, partner with, or operate adjacent to these competitors.\n`;
    }
  }

  // For Step 3, load Inven pool and filter to unused companies
  let invenSection = "";
  const invenPool = votingStep === "step3" ? loadInvenPool() : [];
  const invenRemaining: InvenCompany[] = [];
  if (invenPool.length > 0) {
    const existingLower = new Set(existingTitles.map((t) => t.toLowerCase()));
    for (const c of invenPool) {
      const nameLower = c.name.toLowerCase();
      // Skip if already used (exact or fuzzy match)
      if (existingLower.has(nameLower)) continue;
      if (existingTitles.some((t) => isSimilar(c.name, t))) continue;
      invenRemaining.push(c);
    }
    // Take a keyword-relevant sample of 10-15
    const stopWords = new Set(["and", "the", "for", "with", "from", "into", "that", "this", "are", "was", "has"]);
    const keywords = new Set<string>();
    for (const r of rankings.slice(0, 10)) {
      r.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w))
        .forEach((w) => keywords.add(w));
    }
    // Score and sort
    const scored = invenRemaining.map((c) => {
      const text = `${c.name} ${c.desc}`.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) score++;
      }
      return { company: c, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const poolSample = scored.slice(0, 15).map((s) => s.company);

    if (poolSample.length > 0) {
      invenSection = `
ADDITIONAL INVEN.AI CANDIDATES (not yet included in voting):
${poolSample.map((c) => `- ${c.name}: ${c.desc.slice(0, 150)}`).join("\n")}
Consider 1-2 of these if they align with voting trends. Mark them with "fromPool": true.
`;
    }
  }

  const prompt = `${companySection}

Based on voting patterns, generate 2-3 NEW acquisition target ideas.
${contextSection}${prioritiesSection}${competitorSection}${directionsSection}${injectionFeedback}${invenSection}
Current top-ranked opportunities:
${topRankings}

Current bottom-ranked:
${bottomRankings}

Total votes cast: ${totalVotes}

Existing ideas (do NOT duplicate these, not even paraphrases or near-duplicates): ${existingTitles.join(", ")}

DEDUP RULE: Do NOT generate ideas that are semantically the same as existing ones with slightly different wording (e.g., "Commercial Food Service Equipment" vs "Commercial Foodservice Equipment"). Each new idea must represent a genuinely distinct concept.

${tierGuidance}

Instructions:
- Generate ideas that EXPLORE the themes revealed by top-ranked items
- Align with the company profile and strategic priorities
- Include ONE contrarian/surprising idea that challenges the revealed preferences
- Do NOT explain your reasoning — just provide the ideas
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
