import type { Context } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";

interface RequestBody {
  promptData: string;
  competitorPromptData: string;
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
  const { promptData, competitorPromptData, corrections } = body;

  if (!promptData || !competitorPromptData) {
    return new Response(JSON.stringify({ error: "Missing promptData or competitorPromptData" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey, baseURL: "https://api.anthropic.com" });

  // Strip earnings transcripts and news — competitive analysis only needs financial data + peers
  const sectionsToStrip = ['EARNINGS CALL TRANSCRIPTS', 'NEWS & PRESS RELEASES', 'SEC FILINGS'];
  let slimPromptData = promptData;
  for (const section of sectionsToStrip) {
    const idx = slimPromptData.indexOf(`\n${section}`);
    if (idx > 0) {
      const nextSectionIdx = slimPromptData.indexOf('\n\n', idx + section.length + 10);
      if (nextSectionIdx > idx) {
        const remainder = slimPromptData.slice(nextSectionIdx + 2);
        if (/^[A-Z][A-Z &]+:/.test(remainder)) {
          slimPromptData = slimPromptData.slice(0, idx) + slimPromptData.slice(nextSectionIdx);
          continue;
        }
      }
      slimPromptData = slimPromptData.slice(0, idx).trim();
    }
  }

  const promptDataWithCorrections = corrections
    ? `${slimPromptData}\n${corrections}`
    : slimPromptData;

  const systemMessages: Anthropic.Messages.TextBlockParam[] = [
    {
      type: "text" as const,
      text: "You are a senior M&A strategist providing competitive analysis for a corporate development team.",
    },
    {
      type: "text" as const,
      text: promptDataWithCorrections,
    },
    {
      type: "text" as const,
      text: competitorPromptData,
      // @ts-expect-error — cache_control is supported by the API but not fully typed in all SDK versions
      cache_control: { type: "ephemeral" },
    },
  ];

  const taskPrompt = `Based on the company financial data and competitor financial profiles above, generate Competitive Positioning insight cards.

Generate 3-10 individual cards, each with label: "Competitive Positioning".
Each card focuses on a DIFFERENT competitive dimension. Possible themes (only generate where there's real substance):
- Head-to-head vs. key competitor (name them — one card per major competitor)
- Product/category gaps vs. the competitive set
- Distribution & channel advantages/disadvantages
- Pricing power & brand perception relative to peers
- Geographic coverage gaps
- M&A opportunities to strengthen competitive position
Reference specific competitors by name from the competitive landscape data.
CRITICAL: Never list the company's own subsidiaries or owned brands as competitors. Check the company profile description for owned brands before referencing any company as a competitor.

Each card has:
- "label": "Competitive Positioning"
- "value": a punchy headline (e.g., "Strong in Kitchen, Weak in Smart Home")
- "detail": supporting context in 5-10 words
- "observation": your strategic interpretation — 2-3 sentences, specific and actionable. Reference specific financial metrics from the competitor profiles.

Return ONLY valid JSON:
{
  "highlights": [
    {
      "label": "Competitive Positioning",
      "value": "Strong in Kitchen, Weak in Smart Home",
      "detail": "Clear gaps vs. key competitors",
      "observation": "Compared to SharkNinja and Spectrum Brands..."
    }
  ]
}`;

  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
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
          console.error("generate-competitive stream error:", streamErr);
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
    console.error("generate-competitive error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
