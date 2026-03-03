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

  const body: RequestBody = await req.json();
  const { rankings, totalVotes, sessionName, promptData, competitorPromptData } = body;

  const client = new Anthropic({ apiKey });

  const rankingsList = rankings
    .map((r) => {
      const blurbText = Array.isArray(r.blurb) ? r.blurb.join("; ") : r.blurb;
      return `#${r.rank}. [${r.tier}] "${r.title}" — ${blurbText} (Score: ${r.score}, W-L: ${r.wins}-${r.losses})`;
    })
    .join("\n");

  // Build system message with financial context (Q)
  const systemBlocks: Anthropic.Messages.TextBlockParam[] = [
    {
      type: "text" as const,
      text: "You are a senior M&A advisor preparing a strategic briefing and presentation outline for a corporate development team based on their pairwise voting results.",
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

  if (competitorPromptData) {
    systemBlocks.push({
      type: "text" as const,
      text: competitorPromptData,
      // @ts-expect-error — cache_control is supported by the API but not fully typed in all SDK versions
      cache_control: { type: "ephemeral" },
    });
  }

  const prompt = `You have access to the company's full financial profile and competitor data in the system context above. Use specific financial figures (revenue, margins, firepower, market cap) to ground your analysis.

Session: "${sessionName}"
Total pairwise votes: ${totalVotes}
Ranking method: Bradley-Terry MLE (Elo-equivalent scores, median = 1500)

Force-ranked M&A opportunities (as voted by the team):
${rankingsList}

STEP 1 — ANALYSIS (think through this before writing):
Review the rankings alongside the financial data. In 3-5 sentences, identify:
- What do the top-ranked items have in common?
- What financial constraints or opportunities are most relevant?
- What is the most surprising pattern in the voting?

STEP 2 — WRITE THE STRATEGIC BRIEFING:

Write a strategic briefing structured as follows:

**THEMES (100-150 words):** Identify 2-3 key themes revealed by the team's voting patterns. What strategic directions does the team gravitate toward? Connect to proven M&A frameworks naturally:
- Are they leaning toward scope deals (new capabilities/markets) or scale deals (more of what they do)?
- Is their deal approach programmatic (steady stream of smaller deals) or event-driven (one big move)? Programmatic acquirers outperform by ~2% excess TRS annually.
- How does their integration preference match the deal types they favor? Only 27% of deals achieve both margin improvement and revenue growth — wrong integration model is the #1 deal killer.
Reference specific financial data — e.g., "Given the company's [$X] in available cash, the team's preference for [theme] suggests an appetite for deals in the [$range] range."

**SURPRISES (50-100 words):** Highlight unexpected rankings — ideas that outperformed or underperformed expectations based on the company's current positioning and conventional M&A wisdom.

**RISKS & BLIND SPOTS (50-100 words):** Flag 1-2 strategic risks or blind spots revealed by the voting patterns. What is the team NOT prioritizing that they probably should be?

**RESEARCH QUESTIONS (200-300 words):** This is the primary deliverable. Suggest 5-7 specific, concrete areas for further research. These should be things the team cannot answer from voting alone and would need additional diligence to resolve. Frame them as uncertainties that could materially affect the M&A strategy. Use the financial data to make them specific.

Examples of good research questions:
- "Given [company]'s current debt-to-equity ratio of [X], what is the realistic acquisition capacity without triggering covenant violations?"
- "The team ranked [specific company] highly, but at [market cap] it would represent [X]% of the acquirer's market cap — what financing structure would make this feasible?"
- "What is the actual addressable market for [top-ranked segment] in [company]'s core geographies, and what share could realistically be captured via acquisition vs. organic growth?"
- "Could a joint venture or minority stake in [Company Z] achieve similar strategic objectives with less integration risk?"

STEP 3 — POWERPOINT PRESENTATION OUTLINE:

After the briefing, provide a structured outline that could be directly translated into a PowerPoint presentation using the Claude PowerPoint plugin. Format it as follows:

---PRESENTATION OUTLINE---

SLIDE 1: Title Slide
- Title: "M&A Strategic Assessment: [Session Name]"
- Subtitle: "[Date] | [Total Votes] Pairwise Votes | Bradley-Terry Rankings"

SLIDE 2: Executive Summary
- 3-4 bullet points summarizing the key findings
- Include one data callout (e.g., "Team consensus: [top theme] with [score] confidence")

SLIDE 3: Strategic Themes
- Theme 1: [Title] — [one-line description with financial data point]
- Theme 2: [Title] — [one-line description with financial data point]
- Theme 3: [Title] — [one-line description with financial data point]
- Suggested chart: Horizontal bar chart showing top 10 ranked items by score

SLIDE 4: Top Acquisition Targets
- List top 5 specific companies (if any in rankings) with linkedTheme and key metric
- Suggested chart: Bubble chart — X axis: strategic fit score, Y axis: estimated EV, bubble size: employee count

SLIDE 5: Competitive Positioning
- How the top-ranked opportunities position the company vs. key competitors
- Suggested chart: 2x2 matrix — axes: "Strategic Fit" vs "Financial Feasibility"

SLIDE 6: Surprises & Risks
- 2-3 bullet points on unexpected findings
- 2-3 bullet points on risks/blind spots
- One key risk callout box

SLIDE 7: Research Roadmap
- 5-7 research questions organized by priority (immediate / near-term / longer-term)
- Each with a suggested owner or workstream (e.g., "Finance team", "External advisor", "Market research")

SLIDE 8: Next Steps
- Recommended 30/60/90 day action plan based on the findings
- Decision gates: what needs to be true before proceeding with top targets

---END PRESENTATION OUTLINE---

IMPORTANT RULES:
- This briefing is about the TEAM'S strategic preferences as revealed by their votes. Do NOT discuss the voting methodology, how ideas were generated, or the process itself.
- Never mention "AI", "algorithmic", "machine learning", or how ideas were sourced. All opportunities should be discussed as if they are simply the options the team evaluated.
- Reference M&A best practices naturally — don't name-drop firms (don't say "McKinsey says..."). Instead weave the insights in: "The team's preference for steady dealmaking aligns with what research shows creates the most shareholder value."
- Treat all ranked items equally regardless of their origin.
- Use the company's actual financial figures from the system context — do not make up numbers.
- The presentation outline should be specific enough that someone could build the deck directly from it.

Tone: Professional, board-ready. Direct and analytical. No hedging or filler. Plain language — avoid consulting jargon.

Write in flowing paragraphs for the briefing (except research questions as numbered list). Use the structured format above for the presentation outline.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      temperature: 0.3,
      system: systemBlocks,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Split into briefing narrative and presentation outline
    const outlineSeparator = "---PRESENTATION OUTLINE---";
    const outlineEnd = "---END PRESENTATION OUTLINE---";
    let narrative = text;
    let presentationOutline = "";

    const outlineStart = text.indexOf(outlineSeparator);
    if (outlineStart !== -1) {
      narrative = text.slice(0, outlineStart).trim();
      const outlineEndIdx = text.indexOf(outlineEnd);
      presentationOutline = outlineEndIdx !== -1
        ? text.slice(outlineStart + outlineSeparator.length, outlineEndIdx).trim()
        : text.slice(outlineStart + outlineSeparator.length).trim();
    }

    // Strip the chain-of-thought analysis (Step 1) from the output
    // Look for "STEP 2" or "**THEMES" to find where the actual briefing starts
    const step2Markers = ["**THEMES", "THEMES (", "STEP 2"];
    for (const marker of step2Markers) {
      const idx = narrative.indexOf(marker);
      if (idx !== -1 && idx < 500) {
        narrative = narrative.slice(idx);
        break;
      }
    }

    return new Response(JSON.stringify({ narrative, presentationOutline }), {
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
