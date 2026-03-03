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

CRITICAL: Options must be SPECIFIC TO THIS COMPANY'S SITUATION, not generic MBA frameworks. Use the financial data, earnings call themes, and competitive landscape above to craft options that a board member of THIS company would recognize as relevant to THEIR strategic debate. A voter should be able to clearly distinguish between options and have a genuine preference.

DIMENSION 1 — GROWTH OBJECTIVE (3-5 options, conservative→aggressive)
What is the main strategic goal of acquisitions? Order from safe/incremental to bold/transformational.
BAD (too generic): "Market Share Consolidation" → "Category Extension" → "Revenue Diversification"
GOOD (company-specific): "Defend Core Kitchen" → "Build Commercial Channel" → "Expand into Health & Wellness" → "DTC Brand Portfolio"
Derive your options from the company's actual revenue segments, earnings call priorities, and competitive gaps.

DIMENSION 2 — TARGET PROFILE (3-5 options, conservative→aggressive)
What kind of company should we acquire? Order from safe/proven to risky/innovative.
BAD (too generic): "Established Brands" → "Complementary Players" → "Emerging Disruptors"
GOOD (company-specific): "Proven Kitchen Brands" → "Commercial-Grade Manufacturers" → "DTC-Native Brands" → "Smart Home Startups"
Base these on what this company's actual capability gaps and strategic ambitions suggest.

DIMENSION 3 — RISK POSTURE (3-5 options, conservative→aggressive)
How aggressive should the M&A strategy be? Order from cautious to bold.
BAD (too generic): "Tuck-In Deals" → "Bolt-On Adjacencies" → "Transformational Bets"
GOOD (company-specific): "Sub-$50M Tuck-Ins" → "Mid-Market Bolt-Ons ($50-150M)" → "Category-Defining Platform Deal"
Calibrate the risk levels to the company's actual firepower, leverage capacity, and deal history.

DIMENSION 4 — INTEGRATION (3-5 options, conservative→aggressive)
How will acquired companies fit into the portfolio? Order from tightest integration to most independent.
BAD (too generic): "Full Integration" → "Shared Services" → "Standalone Brands"
GOOD (company-specific): "Fold Into Existing Lines" → "Shared Ops, Separate Brands" → "Independent Brand House"
Tailor to the company's actual operating model and brand architecture.

DIMENSION 5 — CAPABILITY PRIORITY (3-5 options, conservative→aggressive)
What capability matters most in a target? Order from operational/tangible to strategic/intangible.
BAD (too generic): "Manufacturing Scale" → "Distribution Network" → "IP & Patents"
GOOD (company-specific): "Production Capacity" → "Retail Channel Access" → "Product Design & Innovation" → "Digital/DTC Capabilities"
Derive from the company's actual weaknesses and what its competitors have that it lacks.

DIMENSION 6 — STRATEGIC PROXIMITY (3-5 options, conservative→aggressive)
How far from the core business should acquisitions venture? Order from closest to furthest.
BAD (too generic): "Core Strengthening" → "Adjacent Categories" → "White Space Diversification"
GOOD (company-specific): "Double Down on Kitchen" → "Expand Within Home" → "Enter Commercial/Hospitality" → "New Category Entirely"
Use the company's actual product portfolio and competitive landscape to define what "core" vs "adjacent" vs "far afield" means for THIS company.

QUALITY RULES:
- Titles must be 2-4 words — short enough to scan quickly during pairwise voting
- Options within a dimension must be clearly distinguishable — a voter should never think "these are basically the same thing"
- Each option must reflect the financial data and company context above — if you can swap the company name and the option still works, it's too generic
- NEVER generate options that are just synonyms of each other (e.g., "Growth Expansion" vs "Revenue Growth" vs "Scale Revenues" — these are the same thing)

BLURB RULES (for ideas):
- "blurb" must be a JSON array of 2-3 strings
- The FIRST bullet must be a plain-English sentence that a non-MBA person would understand — no jargon, no acronyms, no buzzwords
- Remaining bullets connect the strategic option to THIS company's specific situation — reference the financial data
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
