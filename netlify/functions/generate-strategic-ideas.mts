import type { Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";

interface RequestBody {
  promptData: string;
  corrections?: string;
}

export default async function handler(req: Request, _context: Context) {
  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body: RequestBody = await req.json();
  const { promptData, corrections } = body;

  if (!promptData) {
    return new Response(JSON.stringify({ error: "Missing promptData" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey, baseURL: "https://api.anthropic.com" });

  // Strip earnings transcripts and news — strategic ideas only need financial data
  const sectionsToStrip = ['EARNINGS CALL TRANSCRIPTS', 'NEWS & PRESS RELEASES', 'SEC FILINGS'];
  let slimPromptData = promptData;
  for (const section of sectionsToStrip) {
    const idx = slimPromptData.indexOf(`\n${section}`);
    if (idx > 0) {
      // Find next section or end of string
      const nextSectionIdx = slimPromptData.indexOf('\n\n', idx + section.length + 10);
      if (nextSectionIdx > idx) {
        // Check if this is followed by another section (has a header pattern)
        const remainder = slimPromptData.slice(nextSectionIdx + 2);
        if (/^[A-Z][A-Z &]+:/.test(remainder)) {
          slimPromptData = slimPromptData.slice(0, idx) + slimPromptData.slice(nextSectionIdx);
          continue;
        }
      }
      // Last section — just truncate
      slimPromptData = slimPromptData.slice(0, idx).trim();
    }
  }

  const promptDataWithCorrections = corrections
    ? `${slimPromptData}\n${corrections}`
    : slimPromptData;

  const systemMessages: Anthropic.Messages.TextBlockParam[] = [
    {
      type: "text" as const,
      text: "You are a senior M&A strategist providing strategic framework options for a corporate development team.",
    },
    {
      type: "text" as const,
      text: promptDataWithCorrections,
      // @ts-expect-error — cache_control is supported by the API but not fully typed in all SDK versions
      cache_control: { type: "ephemeral" },
    },
  ];

  const taskPrompt = `Based on the financial data above, generate 3-5 strategic framework options per dimension across 6 DIMENSIONS. Within each dimension, ORDER options from most conservative (dimensionIndex=0) to most aggressive (highest dimensionIndex). The team will vote on which approaches they prefer.

These dimensions are informed by M&A best practices from McKinsey (programmatic M&A), Bain (scope vs. scale deals, outside-in targeting), Accenture (deal archetypes), Deloitte (deal structure alternatives), and BCG (string-of-pearls vs. big-bang). Use plain, direct language — no consulting jargon.

DIMENSION 1 — GROWTH OBJECTIVE (3-5 options, conservative→aggressive)
Why are you acquiring? Order from defensive/incremental to transformational.
Examples: "Protect What We Have" (conservative) → "Get Bigger at What We Do" → "Fill Gaps in Our Lineup" → "Enter New Markets" → "Reinvent the Business" (aggressive)
Context: This captures the scope-vs-scale spectrum. Options 0-1 are scale plays (more of what you do). Options 2-4 are scope plays (add new capabilities or markets).

DIMENSION 2 — TARGET PROFILE (3-5 options, conservative→aggressive)
What kind of company fits? Order from safe/established to unproven/innovative.
Examples: "Buy Proven Operators" (conservative) → "Acquire Strong Brands" → "Add Specialized Capabilities" → "Capture Fast Growers" → "Back Category Creators" (aggressive)
Context: What asset are you really buying — cash flows, brand equity, IP/talent, growth trajectory, or market creation?

DIMENSION 3 — DEAL APPROACH (3-5 options, conservative→aggressive)
How do you want to build the portfolio? Order from fewest/biggest deals to most/smallest.
Examples: "Make One Big Move" (conservative) → "Place a Few Targeted Bets" → "Build a Steady Stream" → "Mix Big and Small Deals" (aggressive)
Context: McKinsey's research shows programmatic acquirers (steady stream) outperform by +2.3% excess TRS annually. BCG frames this as string-of-pearls vs. big-bang. Both approaches have merit depending on the company's situation.

DIMENSION 4 — INTEGRATION (3-5 options, conservative→aggressive)
How tightly do you integrate? Order from tightest to most independent.
Examples: "Absorb Fully" (conservative) → "Share the Backbone" → "Operate Independently" → "Keep at Arm's Length" (aggressive)
Context: Accenture found only 27% of deals achieve both margin improvement and revenue growth — wrong integration model is the #1 deal killer. Tighter integration captures cost synergies but risks destroying what you bought.

DIMENSION 5 — DEAL STRUCTURE (3-5 options, conservative→aggressive)
How do you structure the relationship? Order from full control to least control.
Examples: "Buy Outright" (conservative) → "Take Majority Stakes" → "Form Joint Ventures" → "Make Minority Investments" (aggressive)
Context: Deloitte found a 42% increase in alternative deal structures (JVs, alliances, partnerships). 88% of companies have shifted their targeting strategy in the past 2 years. Full buyouts aren't the only tool anymore.

DIMENSION 6 — STRATEGIC PROXIMITY (3-5 options, conservative→aggressive)
How far from your core business? Order from closest to furthest.
Examples: "Strengthen the Core" (conservative) → "Expand to Adjacent Spaces" → "Enter New Territory" → "Go in a New Direction" (aggressive)
Context: Bain's outside-in approach says start with where growth is heading, not what you already do. But Deloitte's data shows 88% of successful acquirers actually narrowed their sector focus. The tension between focus and expansion is the key strategic choice.

CRITICAL RULES:
- These are PURE STRATEGIC FRAMEWORK choices — they define the HOW and WHY of M&A, not the WHERE or WHAT
- Do NOT reference specific product categories, market segments, end-markets, or industries in titles
- Do NOT generate ideas that name what to buy — generate ideas about the strategic approach to buying
- Titles must be 2-5 words — short, plain-language labels like survey answer choices
- Each option should be informed by the financial data (reference it in the blurbs) but the TITLE stays framework-level
- Use plain, direct language a corp dev team would actually use — avoid consulting buzzwords

GRAMMAR RULE: Every title MUST start with a verb (imperative or action-oriented). This ensures parallel construction across all dimensions.
Examples of GOOD titles: "Get Bigger at What We Do", "Fill Gaps in Our Lineup", "Buy Proven Operators", "Build a Steady Stream", "Absorb Fully", "Form Joint Ventures", "Expand to Adjacent Spaces"
Examples of BAD titles (nouns, jargon, or product-specific): "Proven Operators", "Steady Stream of Deals", "Full Absorption", "Adjacent Spaces", "Transformational Bets", "Commercial Food Service"

BLURB RULES (for ideas):
- "blurb" must be a JSON array of 2-3 strings
- The FIRST bullet must be a plain-English sentence that a non-MBA person would understand — no jargon, no acronyms, no buzzwords
- Remaining bullets connect the strategic option to THIS company's specific situation — reference the financial data
- Under 15 words per bullet — punchy, scannable
- Use **bold** on one key phrase per idea

Each idea MUST include:
- "dimension": short label — one of "Growth Objective", "Target Profile", "Deal Approach", "Integration", "Deal Structure", "Strategic Proximity"
- "dimensionIndex": integer starting at 0 for most conservative within that dimension

Return ONLY valid JSON:
{
  "ideas": [
    {
      "title": "Short Label",
      "dimension": "Growth Objective",
      "dimensionIndex": 0,
      "blurb": ["**Key phrase** plus context for this company", "Second point about what this means"]
    }
  ]
}`;

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      temperature: 0.7,
      system: systemMessages,
      messages: [{ role: "user", content: taskPrompt }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (streamErr) {
          console.error("generate-strategic-ideas stream error:", streamErr);
          controller.error(streamErr);
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
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("generate-strategic-ideas error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
