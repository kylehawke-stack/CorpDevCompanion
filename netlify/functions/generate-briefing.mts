import type { Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";

interface RequestBody {
  promptData: string;
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
  const { promptData, competitorPromptData } = body;

  if (!promptData) {
    return new Response(JSON.stringify({ error: "Missing promptData" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey });

  // System message: persona + financial context (cached for reuse across subsequent calls)
  const systemMessages: Anthropic.Messages.TextBlockParam[] = [
    {
      type: "text" as const,
      text: "You are a senior M&A strategist providing analysis for a corporate development team.",
    },
    {
      type: "text" as const,
      text: promptData,
      // @ts-expect-error — cache_control is supported by the API but not fully typed in all SDK versions
      cache_control: competitorPromptData ? undefined : { type: "ephemeral" },
    },
  ];

  // Block 3: Competitor financial profiles (cached)
  if (competitorPromptData) {
    systemMessages.push({
      type: "text" as const,
      text: competitorPromptData,
      // @ts-expect-error — cache_control is supported by the API but not fully typed in all SDK versions
      cache_control: { type: "ephemeral" },
    });
  }

  const taskPrompt = `You have two tasks based on the financial data provided above:

TASK 1: Generate 9-23 qualitative insight cards from earnings calls, analyst data, and competitive landscape.
TASK 2: Generate 18-30 strategic framework options for pairwise voting (3-5 per dimension, ordered conservative to aggressive).

═══ TASK 1: QUALITATIVE INSIGHT CARDS ═══

Cards 1-6 (Revenue, Profitability, Cash Flow, Firepower, Leverage, Acquisitiveness) are already computed from structured data — do NOT generate those.

Generate 3 CATEGORIES of insight cards. Two categories contain MULTIPLE individual cards; one is a single card.

CATEGORY 1: "Earnings Call Insights" — Generate 3-10 individual cards, each with label: "Earnings Call Insights".
Each card focuses on a DIFFERENT theme from earnings calls. Possible themes (only generate where there's real substance — skip thin themes):
- Management priorities & strategic vision
- Growth initiatives & new products
- Margin commentary & cost management
- Capital allocation & M&A signals
- Supply chain & operations
- Competitive dynamics & market share
- Channel strategy (DTC, retail, international)
- Analyst Q&A tensions & pushback
- Guidance & forward outlook
Each card MUST include a direct attributed quote, e.g., 'As CEO Scott Tidey noted: "quote here"'. Prefer quotes from the Q&A section over prepared remarks. Each card should cover a DISTINCT theme — no overlap.

CATEGORY 2: "Analyst Perspectives" — Generate 3-10 individual cards, each with label: "Analyst Perspectives".
Each card focuses on a DIFFERENT analyst concern or thesis. Possible themes (only generate where there's real substance):
- Revenue outlook & growth expectations
- Margin trajectory & profitability concerns
- Competitive threats & market positioning
- M&A expectations & capital deployment
- Valuation & price target rationale
- Sector headwinds & macro risks
Each card MUST include a direct attributed quote from an analyst, e.g., 'Analyst Adam Bradley asked: "quote here"'. If no formal analyst coverage exists, use analyst questions from the earnings call Q&A. Each card should cover a DISTINCT concern — no overlap.

CATEGORY 3: "Competitive Positioning" — Generate exactly 1 card with label: "Competitive Positioning".
How does the company compare to its direct competitors? Reference specific competitors by name from the competitive landscape data. Identify key competitive advantages, gaps, and M&A opportunities to strengthen positioning.

Each card has:
- "label": the category name (use EXACTLY "Earnings Call Insights", "Analyst Perspectives", or "Competitive Positioning")
- "value": a punchy headline (e.g., "Cautiously Bullish", "DTC Push + Margin Focus", "Strong in Kitchen, Weak in Smart Home")
- "detail": supporting context in 5-10 words
- "observation": your strategic interpretation — 2-3 sentences, specific and actionable. MUST include a real attributed quote for Earnings Call Insights and Analyst Perspectives cards.

QUOTE RULES (critical):
- Every quote MUST be complete — NEVER truncate mid-sentence with "..." or trail off
- If a quote is too long, pick a shorter self-contained excerpt from the same speaker
- Attribute every quote: 'As CEO [Name] noted: "complete quote here"'
- If you cannot find a complete, meaningful quote, paraphrase instead of truncating
- Prefer concise 1-2 sentence quotes that capture the key insight

═══ TASK 2: STRATEGIC FRAMEWORK OPTIONS ═══

Generate 3-5 options per dimension across these 6 DIMENSIONS. Within each dimension, ORDER options from most conservative (dimensionIndex=0) to most aggressive (highest dimensionIndex). The team will vote on which approaches they prefer.

These dimensions are informed by M&A best practices from McKinsey (programmatic M&A), Bain (scope vs. scale deals, outside-in targeting), Accenture (deal archetypes), Deloitte (deal structure alternatives), and BCG (string-of-pearls vs. big-bang). Use plain, direct language — no consulting jargon.

DIMENSION 1 — GROWTH OBJECTIVE (3-5 options, conservative→aggressive)
Why are you acquiring? Order from defensive/incremental to transformational.
Examples: "Protect What We Have" (conservative) → "Get Bigger at What We Do" → "Fill Gaps in Our Lineup" → "Enter New Markets" → "Reinvent the Business" (aggressive)
Context: This captures the scope-vs-scale spectrum. Options 0-1 are scale plays (more of what you do). Options 2-4 are scope plays (add new capabilities or markets).

DIMENSION 2 — TARGET PROFILE (3-5 options, conservative→aggressive)
What kind of company fits? Order from safe/established to unproven/innovative.
Examples: "Proven Operators" (conservative) → "Brand-Led Businesses" → "Capability Specialists" → "Fast Growers" → "Category Creators" (aggressive)
Context: What asset are you really buying — cash flows, brand equity, IP/talent, growth trajectory, or market creation?

DIMENSION 3 — DEAL APPROACH (3-5 options, conservative→aggressive)
How do you want to build the portfolio? Order from fewest/biggest deals to most/smallest.
Examples: "One Big Move" (conservative) → "A Few Targeted Bets" → "Steady Stream of Deals" → "Mix of Big and Small" (aggressive)
Context: McKinsey's research shows programmatic acquirers (steady stream) outperform by +2.3% excess TRS annually. BCG frames this as string-of-pearls vs. big-bang. Both approaches have merit depending on the company's situation.

DIMENSION 4 — INTEGRATION (3-5 options, conservative→aggressive)
How tightly do you integrate? Order from tightest to most independent.
Examples: "Full Absorption" (conservative) → "Shared Backbone" → "Operate Independently" → "Arm's Length" (aggressive)
Context: Accenture found only 27% of deals achieve both margin improvement and revenue growth — wrong integration model is the #1 deal killer. Tighter integration captures cost synergies but risks destroying what you bought.

DIMENSION 5 — DEAL STRUCTURE (3-5 options, conservative→aggressive)
How do you structure the relationship? Order from full control to least control.
Examples: "Full Acquisitions Only" (conservative) → "Majority Stakes" → "Joint Ventures" → "Minority Investments" (aggressive)
Context: Deloitte found a 42% increase in alternative deal structures (JVs, alliances, partnerships). 88% of companies have shifted their targeting strategy in the past 2 years. Full buyouts aren't the only tool anymore.

DIMENSION 6 — STRATEGIC PROXIMITY (3-5 options, conservative→aggressive)
How far from your core business? Order from closest to furthest.
Examples: "Strengthen the Core" (conservative) → "Adjacent Spaces" → "New-to-Company Territory" → "Completely New Direction" (aggressive)
Context: Bain's outside-in approach says start with where growth is heading, not what you already do. But Deloitte's data shows 88% of successful acquirers actually narrowed their sector focus. The tension between focus and expansion is the key strategic choice.

CRITICAL RULES:
- These are PURE STRATEGIC FRAMEWORK choices — they define the HOW and WHY of M&A, not the WHERE or WHAT
- Do NOT reference specific product categories, market segments, end-markets, or industries in titles
- Do NOT generate ideas that name what to buy — generate ideas about the strategic approach to buying
- Titles must be 2-5 words — short, plain-language labels like survey answer choices
- Each option should be informed by the financial data (reference it in the blurbs) but the TITLE stays framework-level
- Use plain, direct language a corp dev team would actually use — avoid consulting buzzwords

Examples of GOOD titles: "Get Bigger at What We Do", "Fill Gaps in Our Lineup", "Proven Operators", "Steady Stream of Deals", "Full Absorption", "Joint Ventures", "Adjacent Spaces"
Examples of BAD titles (too jargony or product-specific): "Transformational Bets", "Bolt-On Adjacencies", "Commercial Food Service", "Smart Kitchen Tech", "White Space Diversification"

BLURB RULES (for ideas):
- "blurb" must be a JSON array of 2-3 strings
- Blurbs connect the strategic option to THIS company's specific situation — use the financial data here
- Under 15 words per bullet — punchy, scannable
- Use **bold** on one key phrase per idea

Each idea MUST include:
- "dimension": short label — one of "Growth Objective", "Target Profile", "Deal Approach", "Integration", "Deal Structure", "Strategic Proximity"
- "dimensionIndex": integer starting at 0 for most conservative within that dimension

Return ONLY valid JSON:
{
  "highlights": [
    {
      "label": "Earnings Call Insights",
      "value": "DTC Push + Margin Focus",
      "detail": "4 quarters of consistent messaging",
      "observation": "Management is laser-focused on direct-to-consumer..."
    },
    {
      "label": "Earnings Call Insights",
      "value": "Supply Chain Reshoring",
      "detail": "Shifting away from China sourcing",
      "observation": "A recurring theme across calls was the move to diversify..."
    },
    {
      "label": "Analyst Perspectives",
      "value": "Cautiously Bullish",
      "detail": "Price targets rising modestly",
      "observation": "Analysts are warming to the margin story..."
    },
    {
      "label": "Analyst Perspectives",
      "value": "M&A Expectations Building",
      "detail": "Balance sheet capacity highlighted",
      "observation": "Several analysts probed management on acquisition plans..."
    },
    {
      "label": "Competitive Positioning",
      "value": "Strong in Kitchen, Weak in Smart Home",
      "detail": "Clear gaps vs. key competitors",
      "observation": "Compared to SharkNinja and Spectrum Brands..."
    }
  ],
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
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
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
          console.error("generate-briefing stream error:", streamErr);
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
    console.error("generate-briefing error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
