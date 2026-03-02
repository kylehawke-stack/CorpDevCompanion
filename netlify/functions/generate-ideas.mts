import type { Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";

function normalizeBlurb(blurb: string | string[]): string[] {
  if (Array.isArray(blurb)) return blurb.length > 0 ? blurb : ["No details provided"];
  const sentences = blurb.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
  return sentences.length > 0 ? sentences : [blurb];
}

interface CompanyProfile {
  symbol: string;
  companyName: string;
  description: string;
  marketCap: number;
  sector: string;
  industry: string;
  ceo: string;
  fullTimeEmployees: string;
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
  companyProfile?: CompanyProfile;
  topStrategicPriorities?: TopStrategicPriority[];
  strategicContext?: {
    freeText?: string;
    earningsTranscript?: string;
    analystNotes?: string;
  };
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

  let companyProfile: CompanyProfile | undefined;
  let topStrategicPriorities: TopStrategicPriority[] = [];
  let strategicContext: RequestBody["strategicContext"];
  let competitorProfiles: CompetitorInfo[] = [];
  let promptData: string | undefined;
  let competitorPromptData: string | undefined;

  try {
    const body: RequestBody = await req.json();
    companyProfile = body.companyProfile;
    topStrategicPriorities = body.topStrategicPriorities ?? [];
    strategicContext = body.strategicContext;
    competitorProfiles = body.competitorProfiles ?? [];
    promptData = body.promptData;
    competitorPromptData = body.competitorPromptData;
  } catch {
    // No body is fine
  }

  const client = new Anthropic({ apiKey });

  // Build system message — use promptData (cached) when available, otherwise basic profile
  const systemBlocks: Anthropic.Messages.TextBlockParam[] = [
    {
      type: "text" as const,
      text: "You are a senior M&A strategist generating market segment and product category ideas for pairwise voting.",
    },
  ];

  if (promptData) {
    systemBlocks.push({
      type: "text" as const,
      text: promptData,
      // @ts-expect-error — cache_control is supported by the API but not fully typed in all SDK versions
      cache_control: competitorPromptData ? undefined : { type: "ephemeral" },
    });
  } else if (companyProfile) {
    const mcap = companyProfile.marketCap >= 1e9
      ? `$${(companyProfile.marketCap / 1e9).toFixed(1)}B`
      : `$${(companyProfile.marketCap / 1e6).toFixed(0)}M`;
    systemBlocks.push({
      type: "text" as const,
      text: `COMPANY PROFILE:\n- Name: ${companyProfile.companyName} (${companyProfile.symbol})\n- Market Cap: ${mcap}\n- CEO: ${companyProfile.ceo}\n- Sector: ${companyProfile.sector} — ${companyProfile.industry}\n- Employees: ${companyProfile.fullTimeEmployees}\n- Description: ${companyProfile.description}`,
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

  // Build strategic priorities section (from Step 1 voting)
  let prioritiesSection = "";
  if (topStrategicPriorities.length > 0) {
    prioritiesSection = `
TOP STRATEGIC PRIORITIES (ranked by team voting in Step 1):
${topStrategicPriorities.map(p => `${p.rank}. "${p.title}" (Score: ${p.score})`).join("\n")}

Generate M&A ideas that strongly align with these voted-on strategic priorities. The higher-ranked priorities should have more influence on your suggestions.
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
      parts.push(`Recent Earnings Call Highlights:\n${strategicContext.earningsTranscript.trim()}`);
    }
    if (strategicContext.analystNotes?.trim()) {
      parts.push(`Analyst Reports & Industry Notes:\n${strategicContext.analystNotes.trim()}`);
    }
    if (parts.length > 0) {
      contextSection = `\nADDITIONAL CONTEXT:\n${parts.join("\n\n")}\n`;
    }
  }

  // Build competitor context
  let competitorSection = "";
  if (competitorProfiles.length > 0) {
    competitorSection = `
COMPETITIVE LANDSCAPE — Key competitors and their product portfolios:
${competitorProfiles.map((c, i) => {
      const mcap = c.marketCap >= 1e9 ? `$${(c.marketCap / 1e9).toFixed(1)}B` : `$${(c.marketCap / 1e6).toFixed(0)}M`;
      let line = `${i + 1}. ${c.name} (${c.symbol}) — ${mcap} [${c.isDirect ? "Direct peer" : "Extended peer"}]`;
      if (c.productSegments.length > 0) line += `\n   Products: ${c.productSegments.join(", ")}`;
      return line;
    }).join("\n")}

Use this competitive intelligence:
- Include at least 2 ideas that directly address competitive gaps or opportunities revealed by competitor portfolios
- Consider competitors' product segments as potential M&A target categories
- Think about adjacent categories where competitors don't yet compete (white space)
- Include competitors themselves as potential acquisition targets if they are realistically sized
`;
  }

  const taskPrompt = `${prioritiesSection}${competitorSection}${contextSection}
Generate exactly 12 M&A target ideas to evaluate. These should span two tiers:

1. **Market Segments** (6 ideas) — broad market categories the company could enter/expand in
2. **Product Categories** (6 ideas) — specific product types within relevant markets

Do NOT include specific company targets — those will be generated later based on voting results.

Requirements:
- Mix obvious adjacencies with creative/contrarian ideas
- Include at least 2 ideas that build on recent acquisitions or strategic moves
- Include at least 2 "left field" ideas that challenge conventional thinking

BULLET FORMAT RULES (critical):
- "blurb" must be a JSON array of 3-5 strings
- Each bullet must be under 15 words — punchy, scannable
- Use **bold** markdown on the key phrase in important bullets (not every bullet)
- Each bullet is a distinct strategic point, not a continuation of a sentence

Example of GOOD bullets:
["**$8B addressable market** growing 12% annually", "Natural extension of kitchen portfolio", "Recent acquisition opens **healthcare adjacency**"]

Return ONLY valid JSON:
{
  "ideas": [
    {
      "title": "string",
      "tier": "market_segment" | "product_category",
      "blurb": ["**Bold key point** plus context", "Second short bullet", "Third short bullet"]
    }
  ]
}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      temperature: 0.9,
      system: systemBlocks,
      messages: [{ role: "user", content: taskPrompt }],
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
      (idea: { title: string; tier: string; blurb: string | string[] }) => ({
        id: crypto.randomUUID(),
        title: idea.title,
        tier: idea.tier,
        blurb: normalizeBlurb(idea.blurb),
        source: "seed",
        createdAt: Date.now(),
      })
    );

    return new Response(JSON.stringify({ ideas }), {
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
