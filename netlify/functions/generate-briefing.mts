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

TASK 1: Generate 3 qualitative insight cards from earnings calls, analyst data, and competitive landscape.
TASK 2: Generate 18-30 strategic framework options for pairwise voting (3-5 per dimension, ordered conservative to aggressive).

═══ TASK 1: QUALITATIVE INSIGHT CARDS ═══

Generate exactly 3 insight cards. Cards 1-6 (Revenue, Profitability, Cash Flow, Firepower, Leverage, Acquisitiveness) are already computed from structured data — do NOT generate those.

1. "Earnings Call Insights" — synthesize the key strategic themes management discussed across the earnings calls, with HEAVY weight on the analyst Q&A sections. What is leadership focused on? What are they worried about? Mention specific initiatives by name. You MUST include a direct quote from the earnings call transcript attributed to its speaker, e.g., 'As CEO Scott Tidey noted: "quote here"'. Prefer quotes from the Q&A section over prepared remarks.

2. "Analyst Perspectives" — synthesize analyst sentiment from estimates, price targets, and analyst Q&A in earnings calls. You MUST include a direct quote from an analyst question or comment attributed to its speaker, e.g., 'Analyst Adam Bradley asked: "quote here"'. If no formal analyst coverage exists, use analyst questions from the earnings call Q&A.

3. "Competitive Positioning" — How does the company compare to its direct competitors? Reference specific competitors by name from the competitive landscape data. Identify key competitive advantages, gaps, and M&A opportunities to strengthen positioning. Where are competitors strong that this company is weak? What adjacencies do competitor product portfolios reveal?

Each card has:
- "label": the category name (use exactly the names above)
- "value": a punchy headline (e.g., "Cautiously Bullish", "DTC Push + Margin Focus", "Strong in Kitchen, Weak in Smart Home")
- "detail": supporting context in 5-10 words
- "observation": your strategic interpretation — 2-3 sentences, specific and actionable. MUST include a real attributed quote for cards #1 and #2.

QUOTE RULES (critical):
- Every quote MUST be complete — NEVER truncate mid-sentence with "..." or trail off
- If a quote is too long, pick a shorter self-contained excerpt from the same speaker
- Attribute every quote: 'As CEO [Name] noted: "complete quote here"'
- If you cannot find a complete, meaningful quote, paraphrase instead of truncating
- Prefer concise 1-2 sentence quotes that capture the key insight

═══ TASK 2: STRATEGIC FRAMEWORK OPTIONS ═══

Generate 3-5 options per dimension across these 6 DIMENSIONS. Within each dimension, ORDER options from most conservative (dimensionIndex=0) to most aggressive (highest dimensionIndex). The team will vote on which approaches they prefer.

DIMENSION 1 — GROWTH OBJECTIVE (3-5 options, conservative→aggressive)
What is the main strategic goal of acquisitions? Order from safe/incremental to bold/transformational.
Examples: "Market Share Consolidation" (conservative) → "Category Extension" → "Revenue Diversification" → "Geographic Expansion" → "Technology Leap" (aggressive)

DIMENSION 2 — TARGET PROFILE (3-5 options, conservative→aggressive)
What kind of company should we acquire? Order from safe/proven to risky/innovative.
Examples: "Established Brands" (conservative) → "Complementary Players" → "Manufacturing Capability" → "Innovation Leaders" → "Emerging Disruptors" (aggressive)

DIMENSION 3 — RISK POSTURE (3-5 options, conservative→aggressive)
How aggressive should the M&A strategy be? Order from cautious to bold.
Examples: "Tuck-In Deals" (conservative) → "Bolt-On Adjacencies" → "Platform Acquisitions" → "Transformational Bets" (aggressive)

DIMENSION 4 — INTEGRATION (3-5 options, conservative→aggressive)
How will acquired companies fit into the portfolio? Order from tightest integration to most independent.
Examples: "Full Integration" (conservative) → "Shared Services" → "Brand Rollup" → "Standalone Brands" (aggressive)

DIMENSION 5 — CAPABILITY PRIORITY (3-5 options, conservative→aggressive)
What capability matters most in a target? Order from operational/tangible to strategic/intangible.
Examples: "Manufacturing Scale" (conservative) → "Supply Chain Access" → "Distribution Network" → "Brand Equity" → "IP & Patents" (aggressive)

DIMENSION 6 — STRATEGIC PROXIMITY (3-5 options, conservative→aggressive)
How far from the core business should acquisitions venture? Order from closest to furthest.
Examples: "Core Strengthening" (conservative) → "Adjacent Categories" → "New-to-Company Expansion" → "White Space Diversification" (aggressive)

CRITICAL RULES:
- These are PURE STRATEGIC FRAMEWORK choices — they define the HOW and WHY of M&A, not the WHERE or WHAT
- Do NOT reference specific product categories, market segments, end-markets, or industries in titles
- Do NOT generate ideas that name what to buy — generate ideas about the strategic approach to buying
- Titles must be 2-4 words — short strategic labels like survey answer choices
- Each option should be informed by the financial data (reference it in the blurbs) but the TITLE stays framework-level

Examples of GOOD titles: "Geographic Expansion", "Bolt-On Adjacencies", "Manufacturing Capability", "Standalone Brands", "Premium Brand Play", "Vertical Integration", "DTC Channel Build", "Innovation Leaders"
Examples of BAD titles (too product/market specific): "Commercial Food Service", "Outdoor Cooking Brands", "Smart Kitchen Tech", "Health & Wellness Products", "Latin American Markets"

BLURB RULES (for ideas):
- "blurb" must be a JSON array of 2-3 strings
- Blurbs connect the strategic option to THIS company's specific situation — use the financial data here
- Under 15 words per bullet — punchy, scannable
- Use **bold** on one key phrase per idea

Each idea MUST include:
- "dimension": short label — one of "Growth Objective", "Target Profile", "Risk Posture", "Integration", "Capability Priority", "Strategic Proximity"
- "dimensionIndex": integer starting at 0 for most conservative within that dimension

Return ONLY valid JSON:
{
  "highlights": [
    {
      "label": "Earnings Call Insights",
      "value": "DTC Push + Margin Focus",
      "detail": "4 quarters of consistent messaging",
      "observation": "Management is laser-focused on direct-to-consumer..."
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
