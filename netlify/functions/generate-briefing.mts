import type { Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";

interface RequestBody {
  promptData: string;
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
  const { promptData } = body;

  if (!promptData) {
    return new Response(JSON.stringify({ error: "Missing promptData" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are a senior M&A strategist. You have two tasks:

TASK 1: Generate 3 qualitative insight cards from earnings calls, analyst data, and competitive landscape.
TASK 2: Generate 24 strategic framework options for pairwise voting.

${promptData}

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

═══ TASK 2: STRATEGIC FRAMEWORK OPTIONS ═══

Generate exactly 24 strategic options across these 6 DIMENSIONS (4 options each). The team will vote on which approaches they prefer.

DIMENSION 1 — PRIMARY GROWTH OBJECTIVE (4 options)
What is the main strategic goal of acquisitions? Options like:
"Geographic Expansion", "Category Extension", "Revenue Diversification", "Market Share Consolidation", "Vertical Integration", "Technology Leap", "Scale & Efficiency"

DIMENSION 2 — TARGET COMPANY PROFILE (4 options)
What kind of company should we acquire? Options like:
"Established Brands", "Innovation Leaders", "Manufacturing Capability", "Channel & Distribution", "Emerging Disruptors", "Margin Enhancers", "Complementary Players"

DIMENSION 3 — DEAL RISK POSTURE (4 options)
How aggressive should the M&A strategy be? Options like:
"Bolt-On Adjacencies", "Transformational Bets", "Defensive Consolidation", "Platform Acquisitions", "Tuck-In Deals", "Scale-Up Plays", "Strategic Optionality"

DIMENSION 4 — INTEGRATION APPROACH (4 options)
How will acquired companies fit into the portfolio? Options like:
"Full Integration", "Standalone Brands", "Brand Rollup", "Capability Absorption", "Joint Venture Model", "Holding Company", "Shared Services"

DIMENSION 5 — STRATEGIC CAPABILITY PRIORITY (4 options)
What capability matters most in a target? Options like:
"Manufacturing Scale", "Brand Equity", "IP & Patents", "Distribution Network", "Digital & DTC", "Talent & Engineering", "Supply Chain Access"

DIMENSION 6 — STRATEGIC PROXIMITY (4 options)
How far from the core business should acquisitions venture? This dimension is informed by the competitive landscape — how close to existing competitors vs. exploring white space. Options like:
"Core Strengthening", "Adjacent Categories", "New-to-Company Expansion", "White Space Diversification"

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
      "blurb": ["**Key phrase** plus context for this company", "Second point about what this means"]
    }
  ]
}`;

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
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
