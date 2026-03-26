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

  // Extract only the sections this function needs: company profile, transcripts, and analyst data.
  // The full promptData includes financials, competitive landscape, SEC filings, news, etc.
  // that are irrelevant for earnings/analyst insight cards and push context over Netlify's limits.
  const sectionsToKeep = ['COMPANY PROFILE:', 'EARNINGS CALL TRANSCRIPTS', 'ANALYST ESTIMATES', 'ANALYST PRICE TARGETS:'];
  const allSectionHeaders = [
    'COMPANY PROFILE:', 'FINANCIAL PERFORMANCE', 'KEY FINANCIAL METRICS:', 'REVENUE SEGMENTATION:',
    'ANALYST ESTIMATES', 'ANALYST PRICE TARGETS:', 'COMPETITIVE LANDSCAPE',
    'SEC FILINGS', 'MERGERS & ACQUISITIONS ACTIVITY', 'NEWS & PRESS RELEASES',
    'EARNINGS CALL TRANSCRIPTS',
  ];

  const keptParts: string[] = [];
  for (const keep of sectionsToKeep) {
    const idx = promptData.indexOf(keep);
    if (idx === -1) continue;
    // Find the start of the next section after this one
    let endIdx = promptData.length;
    for (const header of allSectionHeaders) {
      if (header === keep) continue;
      const hIdx = promptData.indexOf(header, idx + keep.length);
      if (hIdx > idx && hIdx < endIdx) endIdx = hIdx;
    }
    keptParts.push(promptData.slice(idx, endIdx).trim());
  }
  let trimmedPromptData = keptParts.join('\n\n');

  // Cap total transcript section to ~10K chars to stay within Netlify timeout.
  // The transcripts are the largest section; we need good quotes, not every word.
  const txIdx = trimmedPromptData.indexOf('EARNINGS CALL TRANSCRIPTS');
  if (txIdx !== -1 && trimmedPromptData.length - txIdx > 10000) {
    trimmedPromptData = trimmedPromptData.slice(0, txIdx + 10000);
  }

  const promptDataWithCorrections = corrections
    ? `${trimmedPromptData}\n${corrections}`
    : trimmedPromptData;

  const systemMessages: Anthropic.Messages.TextBlockParam[] = [
    {
      type: "text" as const,
      text: "You are a senior M&A strategist providing analysis for a corporate development team.",
    },
    {
      type: "text" as const,
      text: promptDataWithCorrections,
      // @ts-expect-error — cache_control is supported by the API but not fully typed in all SDK versions
      cache_control: { type: "ephemeral" },
    },
  ];

  const taskPrompt = `Based on the financial data above, generate qualitative insight cards from earnings calls and analyst data.

Cards 1-6 (Revenue, Profitability, Cash Flow, Firepower, Leverage, Acquisitiveness) are already computed from structured data — do NOT generate those.

Generate 2 CATEGORIES of insight cards:

CATEGORY 1: "Earnings Call Insights" — Generate 5-10 individual cards, each with label: "Earnings Call Insights". Aim for the UPPER end of this range. Generate fewer cards ONLY if the earnings transcripts lack sufficient distinct themes.
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

CATEGORY 2: "Analyst Perspectives" — Generate 4-10 individual cards, each with label: "Analyst Perspectives". Aim for the UPPER end of this range. Generate fewer cards ONLY if there is insufficient analyst coverage or Q&A content.
Each card focuses on a DIFFERENT analyst concern or thesis. Possible themes (only generate where there's real substance):
- Revenue outlook & growth expectations
- Margin trajectory & profitability concerns
- Competitive threats & market positioning
- M&A expectations & capital deployment
- Valuation & price target rationale
- Sector headwinds & macro risks
Each card MUST include a direct attributed quote FROM THE ANALYST THEMSELVES — quote the analyst's question or comment, NEVER management's response. Format: 'Analyst Adam Bradley asked: "quote here"'. If no formal analyst coverage exists, use analyst questions from the earnings call Q&A. NEVER attribute a quote to "Management" in an Analyst Perspectives card. Each card should cover a DISTINCT concern — no overlap.

Each card has:
- "label": the category name (use EXACTLY "Earnings Call Insights" or "Analyst Perspectives")
- "value": a punchy headline (e.g., "Cautiously Bullish", "DTC Push + Margin Focus")
- "detail": supporting context in 5-10 words
- "observation": your strategic interpretation — 2-3 sentences, specific and actionable. MUST include a real attributed quote.

QUOTE RULES (critical):
- Every quote MUST be complete — NEVER truncate mid-sentence with "..." or trail off
- If a quote is too long, pick a shorter self-contained excerpt from the same speaker
- Attribute every quote: 'As CEO [Name] noted: "complete quote here"'
- If you cannot find a complete, meaningful quote, paraphrase instead of truncating
- Prefer concise 1-2 sentence quotes that capture the key insight

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
      "label": "Analyst Perspectives",
      "value": "Cautiously Bullish",
      "detail": "Price targets rising modestly",
      "observation": "Analysts are warming to the margin story..."
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
          console.error("generate-insights stream error:", streamErr);
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
    console.error("generate-insights error:", errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
