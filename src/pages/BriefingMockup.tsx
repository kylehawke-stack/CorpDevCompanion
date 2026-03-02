/**
 * BriefingMockup.tsx
 * Static mockup of the redesigned Intelligence Briefing page.
 * Uses hardcoded HBB data matching the REAL backend data shape from
 * analyze-company.mts (6 FinancialHighlight cards) and generate-briefing.mts
 * (3 AI insight cards). This is a preview-only page at /#mockup.
 *
 * Data contract reference: src/types/index.ts (BriefingKPI, BRIEFING_CARD_GROUPS)
 */

import type { FinancialHighlight, RevenueSegment } from '../types/index.ts';
import { BRIEFING_CARD_GROUPS } from '../types/index.ts';

// ─── Sample Data (HBB) matching real backend output ────────────────────

const COMPANY = {
  symbol: 'HBB',
  name: 'Hamilton Beach Brands Holding Co.',
  sector: 'Consumer Cyclical',
  industry: 'Furnishings, Fixtures & Appliances',
  image: 'https://financialmodelingprep.com/image-stock/HBB.png',
  ceo: 'Scott Tidey',
};

// These 6 cards come from analyze-company.mts (deterministic, computed from FMP data)
const COMPUTED_HIGHLIGHTS: FinancialHighlight[] = [
  {
    label: 'Revenue & Growth',
    value: '$618M',
    detail: '+3.2% YoY growth',
    observation: 'Moderate organic growth provides a stable foundation. Acquisitions could meaningfully accelerate revenue beyond organic capabilities without signaling desperation.',
  },
  {
    label: 'Profitability',
    value: '24.3%',
    detail: '8.1% operating margin',
    observation: 'Moderate margins suggest acquisitions should be accretive or target margin-enhancing capabilities like manufacturing efficiency, brand premium, or scale advantages.',
  },
  {
    label: 'Cash Flow & Firepower',
    value: '$52M',
    detail: '$45M cash on hand',
    observation: 'Positive FCF of $52M supports smaller acquisitions. Larger transformational deals would likely require debt financing or equity issuance.',
  },
  {
    label: 'Acquisition Firepower',
    value: '$123M',
    detail: '$45M cash + $78M est. capacity',
    observation: 'Moderate acquisition firepower supports several bolt-on deals or one meaningful platform acquisition with additional debt financing.',
  },
  {
    label: 'Leverage & Capacity',
    value: '0.87x',
    detail: '$52M net debt',
    observation: 'Moderate leverage at 0.87x with room for incremental debt to finance acquisitions. Could likely add 1-2x EBITDA in deal-related borrowing.',
  },
  {
    label: 'Acquisitiveness',
    value: 'Selective Buyer',
    detail: '$24M deployed in 2 years',
    observation: 'Selective acquisition approach -- the company targets deals carefully. May need to expand integration capabilities for larger or more frequent transactions.',
  },
];

// These 3 cards come from generate-briefing.mts (AI-generated, same FinancialHighlight shape)
const AI_HIGHLIGHTS: FinancialHighlight[] = [
  {
    label: 'Earnings Call Insights',
    value: 'DTC Push + Margin Focus',
    detail: '4 quarters of consistent messaging',
    observation: 'Management has consistently emphasized three strategic themes across recent earnings calls: expanding direct-to-consumer channels, driving margin improvement through operational efficiency, and building the Hamilton Beach Health brand as a premium growth vector. As CEO Scott Tidey noted: \u201cWe are investing in our direct-to-consumer capabilities because we believe that is where the margin opportunity lives. Our Hamilton Beach Health initiative is still early but the customer response has been very encouraging and we see a real path to building a meaningful premium business over time.\u201d',
  },
  {
    label: 'Analyst Perspectives',
    value: 'Cautiously Optimistic',
    detail: '3 analysts covering, $32 consensus target',
    observation: 'Analyst coverage is limited but constructive. The consensus price target of $32 implies ~12% upside. Key analyst concerns center on margin timing from the DTC ramp and the competitive response from larger appliance players entering premium kitchen segments. Analyst Adam Bradley asked: \u201cCan you help us understand the margin trajectory as you ramp the DTC business? It seems like the investment phase should start yielding returns in the back half, but I want to make sure we are modeling the puts and takes correctly.\u201d',
  },
  {
    label: 'Competitive Positioning',
    value: 'Strong in Kitchen, Weak in Smart Home',
    detail: '5 peers benchmarked',
    observation: 'HBB dominates kitchen small appliances but lacks the connected-home capabilities of iRobot and the premium brand positioning of Lovesac. Lifetime Brands represents the closest competitive overlap with a broader kitchenware portfolio. M&A could target smart appliance IP or premium DTC brands to close gaps.',
  },
];

const ALL_HIGHLIGHTS = [...COMPUTED_HIGHLIGHTS, ...AI_HIGHLIGHTS];

const REVENUE_SEGMENTS: RevenueSegment[] = [
  { name: 'Consumer', revenue: 398_000_000, percent: 64 },
  { name: 'Commercial', revenue: 142_000_000, percent: 23 },
  { name: 'Licensing', revenue: 78_000_000, percent: 13 },
];

const SEGMENT_COLORS = ['bg-[#f97316]', 'bg-indigo-500', 'bg-emerald-500'];

// ─── Helpers ──────────────────────────────────────────────────────────

function formatRevenue(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toFixed(0)}`;
}

/**
 * Extract a quote + attribution from an observation string.
 * Matches the pattern the AI uses: As CEO Scott Tidey noted: \u201cquote\u201d
 * Returns null if no quote found.
 */
function extractQuote(observation: string): { text: string; speaker: string; surrounding: string } | null {
  const regex = /((?:As\s+)?(?:CEO|CFO|Analyst|analyst|President|SVP|VP|COO)\s+[^:"\u201c]+)(?:noted|said|stated|asked|observed|commented|probed|remarked|explained|highlighted|mentioned|emphasized):\s*["\u201c]([^"\u201d]+)["\u201d]/i;
  const match = observation.match(regex);
  if (!match) return null;

  const speaker = match[1].replace(/^As\s+/i, '').trim();
  const text = match[2].trim();
  // Get text before the quote attribution
  const quoteStart = observation.indexOf(match[0]);
  const surrounding = observation.slice(0, quoteStart).trim();

  return { text, speaker, surrounding };
}

// ─── Derived data from the contract ───────────────────────────────────

const kpiHighlights = BRIEFING_CARD_GROUPS.kpiLabels
  .map(label => ALL_HIGHLIGHTS.find(h => h.label === label))
  .filter(Boolean) as FinancialHighlight[];

const narrativeHighlights = BRIEFING_CARD_GROUPS.narrativeLabels
  .map(label => ALL_HIGHLIGHTS.find(h => h.label === label))
  .filter(Boolean) as FinancialHighlight[];

const pullquoteHighlights = BRIEFING_CARD_GROUPS.pullquoteLabels
  .map(label => ALL_HIGHLIGHTS.find(h => h.label === label))
  .filter(Boolean) as FinancialHighlight[];

// ─── Main Mockup Component ────────────────────────────────────────────

export function BriefingMockup() {
  return (
    <div className="min-h-screen bg-[#0f1419] py-10 px-4">
      <div className="max-w-7xl mx-auto">

        {/* ── Company Header ────────────────────────────────── */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <img
              src={COMPANY.image}
              alt=""
              className="w-12 h-12 rounded-lg object-contain bg-white/10 p-1 border border-[#2a3a4e]"
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">
                  {COMPANY.name}
                </h1>
                <span className="font-mono text-sm text-[#64748b] bg-[#1a2332] px-2 py-0.5 rounded border border-[#2a3a4e]">
                  {COMPANY.symbol}
                </span>
              </div>
              <p className="text-sm text-[#64748b] mt-0.5">
                {COMPANY.sector} &middot; {COMPANY.industry} &middot; CEO: {COMPANY.ceo}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316]">
              Intelligence Briefing
            </span>
            <span className="text-[#2a3a4e]">/</span>
            <span className="text-xs text-[#64748b]">
              2 years of financials, 4 quarterly earnings calls, analyst consensus, competitive landscape
            </span>
          </div>
        </header>

        {/* ── KPI Strip (4-stat row, derived from highlights by label) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {kpiHighlights.map((h) => (
            <div
              key={h.label}
              className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl px-5 py-4"
            >
              <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-2">
                {h.label === 'Acquisition Firepower' ? 'Firepower' : h.label.split(' &')[0]}
              </p>
              <p className="font-mono text-2xl font-bold text-white leading-none">
                {h.value}
              </p>
              <p className="text-xs text-[#64748b] mt-1.5 font-mono">
                {h.detail}
              </p>
            </div>
          ))}
        </div>

        {/* ── Revenue Mix (compact) ─────────────────────────── */}
        <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316]">
              Revenue Mix
            </p>
            <span className="text-xs text-[#64748b]">by product segment</span>
          </div>
          <div className="flex rounded-full overflow-hidden h-3 mb-4">
            {REVENUE_SEGMENTS.map((s, i) => (
              <div
                key={s.name}
                className={`${SEGMENT_COLORS[i]} transition-all`}
                style={{ width: `${s.percent}%` }}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {REVENUE_SEGMENTS.map((s, i) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-sm ${SEGMENT_COLORS[i]}`} />
                <span className="text-sm text-[#e2e8f0]">{s.name}</span>
                <span className="font-mono text-sm text-[#64748b]">{formatRevenue(s.revenue)}</span>
                <span className="font-mono text-sm font-semibold text-[#f97316]">{s.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Narrative Cards (2-column, analysis only -- no headline numbers) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {narrativeHighlights.map((h) => (
            <div
              key={h.label}
              className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5"
            >
              <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">
                {h.label}
              </p>
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                {h.observation}
              </p>
            </div>
          ))}
        </div>

        {/* ── Pullquote Section (Earnings Call + Analyst) ──── */}
        <div className="space-y-5 mb-10">
          {pullquoteHighlights.map((h) => {
            const extracted = extractQuote(h.observation);
            return (
              <div
                key={h.label}
                className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316]">
                    {h.label}
                  </p>
                  <p className="text-xs text-[#64748b]">{h.detail}</p>
                </div>

                <p className="text-lg font-semibold text-[#e2e8f0] mb-4">
                  {h.value}
                </p>

                {/* Context paragraph (text before the quote) */}
                {extracted?.surrounding && (
                  <p className="text-sm text-[#94a3b8] leading-relaxed mb-4">
                    {extracted.surrounding}
                  </p>
                )}

                {/* Pullquote with orange border */}
                {extracted ? (
                  <blockquote className="border-l-4 border-[#f97316] pl-5 py-3 bg-[#f97316]/[0.04] rounded-r-lg">
                    <p className="text-base text-[#e2e8f0] italic leading-relaxed">
                      &ldquo;{extracted.text}&rdquo;
                    </p>
                    <p className="text-sm text-[#f97316] mt-2 font-medium not-italic">
                      &mdash; {extracted.speaker}
                    </p>
                  </blockquote>
                ) : (
                  // Fallback: no parseable quote, render observation as plain text
                  <p className="text-sm text-[#94a3b8] leading-relaxed">
                    {h.observation}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* ── CTA Button ───────────────────────────────────── */}
        <div className="text-center pt-2 pb-8">
          <button className="inline-flex items-center justify-center rounded-lg font-medium bg-[#f97316] text-white hover:bg-[#ea580c] px-10 py-3 text-base transition-colors shadow-lg shadow-[#f97316]/20">
            Begin Strategic Prioritization
          </button>
          <p className="text-xs text-[#64748b] mt-3">
            24 strategic options ready for pairwise comparison across 6 dimensions
          </p>
        </div>

      </div>
    </div>
  );
}
