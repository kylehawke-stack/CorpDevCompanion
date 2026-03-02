import type { Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";

interface RankingSummary {
  rank: number;
  title: string;
  tier: string;
  blurb: string | string[];
  score: number;
  wins: number;
  losses: number;
}

interface RequestBody {
  rankings: RankingSummary[];
  totalVotes: number;
  sessionName: string;
  strategicContext?: {
    freeText?: string;
    earningsTranscript?: string;
    analystNotes?: string;
  };
}

export default async function handler(req: Request, _context: Context) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body: RequestBody = await req.json();
  const { rankings, totalVotes, sessionName, strategicContext } = body;

  const client = new Anthropic({ apiKey });

  const rankingsList = rankings
    .map((r) => {
      const blurbText = Array.isArray(r.blurb) ? r.blurb.join("; ") : r.blurb;
      return `#${r.rank}. [${r.tier}] "${r.title}" — ${blurbText} (Score: ${r.score}, W-L: ${r.wins}-${r.losses})`;
    })
    .join("\n");

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
      contextSection = `\nStrategic context provided by the team:\n${parts.join("\n\n")}\n\nReference this context when analyzing themes and recommending research areas.\n`;
    }
  }

  const prompt = `You are a senior M&A advisor preparing a strategic briefing for Hamilton Beach Brands' executive team based on their pairwise voting results.

Session: "${sessionName}"
Total pairwise votes: ${totalVotes}
Ranking method: Bradley-Terry MLE (Elo-equivalent scores, median = 1500)
${contextSection}
Force-ranked M&A opportunities (as voted by the executive team):
${rankingsList}

Write a 400-600 word strategic briefing that:

1. **Identifies 2-3 key themes** revealed by the executive team's voting patterns (what strategic directions does leadership gravitate toward?)
2. **Connects to proven M&A frameworks** — where the team's preferences align (or diverge) from what works in practice:
   - Are they leaning toward scope deals (new capabilities/markets) or scale deals (more of what they do)? Scope deals made up 60% of large deals in 2025.
   - Is their deal approach programmatic (steady stream of smaller deals) or event-driven (one big move)? Programmatic acquirers outperform by ~2% excess TRS annually.
   - How does their integration preference match the deal types they favor? Only 27% of deals achieve both margin improvement and revenue growth — wrong integration model is the #1 deal killer.
   - Are they open to alternative deal structures (JVs, partnerships, minority stakes) or focused on full acquisitions?
3. **Highlights surprises** — any unexpected rankings or ideas that outperformed/underperformed expectations
4. **Flags risks** — 1-2 strategic risks or blind spots revealed by the voting patterns
5. **Suggests 3-5 specific areas for further research** — concrete open questions that need additional diligence to resolve

Examples of good research suggestions:
- "Is [Company X] within financial reach given HBB's current balance sheet and debt capacity?"
- "Does [Company Y] manufacture its own products, and if so, where are those facilities relative to HBB's manufacturing footprint?"
- "What is the actual market size for [segment] in HBB's core geographies, and is it growing or contracting?"
- "Are there regulatory or antitrust considerations in acquiring a [category] player given HBB's existing market share?"
- "Could a joint venture or minority stake in [Company Z] achieve similar strategic objectives with less integration risk?"

IMPORTANT RULES:
- This briefing is about the EXECUTIVE TEAM'S strategic preferences as revealed by their votes. Do NOT discuss or highlight the process, methodology, or how ideas were generated. The focus is entirely on what the voting reveals about strategic direction.
- Never mention "AI", "algorithmic", "machine learning", or how ideas were sourced. All opportunities should be discussed as if they are simply the options the team evaluated.
- Reference M&A best practices naturally — don't name-drop firms (don't say "McKinsey says..."). Instead weave the insights in: "The team's preference for steady dealmaking aligns with what research shows creates the most shareholder value" or "Their strong preference for full absorption may conflict with the scope-oriented targets they ranked highest."
- Treat all ranked items equally regardless of their origin.
- The research suggestions should focus on unknowns that are specific to the top-ranked opportunities.

Tone: Professional, board-ready. Direct and analytical. No hedging or filler. Plain language — avoid consulting jargon.

Write in flowing paragraphs, not bullet points (except for the research suggestions section). Do not use headers/markdown formatting.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });

    const narrative =
      message.content[0].type === "text" ? message.content[0].text : "";

    return new Response(JSON.stringify({ narrative }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
