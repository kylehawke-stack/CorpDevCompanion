/**
 * BriefingMockup.tsx
 * Static mockup of the redesigned Intelligence Briefing page.
 * Uses hardcoded HBB data so we can validate the new layout
 * before wiring it to real state.
 */

// ─── Sample Data (HBB - Hamilton Beach Brands) ────────────────────────────

const COMPANY = {
  symbol: 'HBB',
  name: 'Hamilton Beach Brands Holding Co.',
  sector: 'Consumer Cyclical',
  industry: 'Furnishings, Fixtures & Appliances',
  image: 'https://financialmodelingprep.com/image-stock/HBB.png',
  marketCap: '$385M',
  price: '$28.42',
  ceo: 'Scott Tidey',
};

const KPI_STRIP = [
  { label: 'Revenue', value: '$618M', delta: '+3.2% YoY', sentiment: 'neutral' as const },
  { label: 'Gross Margin', value: '24.3%', delta: '8.1% operating', sentiment: 'neutral' as const },
  { label: 'Leverage', value: '0.87x', delta: '$52M net debt', sentiment: 'positive' as const },
  { label: 'Firepower', value: '$128M', delta: '$45M cash + $83M capacity', sentiment: 'positive' as const },
];

const REVENUE_SEGMENTS = [
  { name: 'Consumer', revenue: 398_000_000, percent: 64 },
  { name: 'Commercial', revenue: 142_000_000, percent: 23 },
  { name: 'Licensing', revenue: 78_000_000, percent: 13 },
];

const SEGMENT_COLORS = ['bg-[#f97316]', 'bg-indigo-500', 'bg-emerald-500'];

const NARRATIVE_CARDS = [
  {
    label: 'Revenue & Growth',
    headline: '$618M',
    detail: '+3.2% YoY growth',
    sentiment: 'neutral' as const,
    body: 'Moderate organic growth provides a stable foundation. Acquisitions could meaningfully accelerate revenue beyond organic capabilities without signaling desperation.',
  },
  {
    label: 'Profitability',
    headline: '24.3%',
    detail: '8.1% operating margin',
    sentiment: 'neutral' as const,
    body: 'Moderate margins suggest acquisitions should be accretive or target margin-enhancing capabilities like manufacturing efficiency, brand premium, or scale advantages.',
  },
  {
    label: 'Cash Flow & Firepower',
    headline: '$52M FCF',
    detail: '$45M cash on hand',
    sentiment: 'positive' as const,
    body: 'Positive FCF of $52M supports smaller acquisitions. Larger transformational deals would likely require debt financing or equity issuance.',
  },
  {
    label: 'Acquisitiveness',
    headline: 'Selective Buyer',
    detail: '$24M deployed in 2 years',
    sentiment: 'neutral' as const,
    body: 'Selective acquisition approach -- the company targets deals carefully. May need to expand integration capabilities for larger or more frequent transactions.',
  },
  {
    label: 'Leverage & Capacity',
    headline: '0.87x D/E',
    detail: '$52M net debt',
    sentiment: 'positive' as const,
    body: 'Moderate leverage at 0.87x with room for incremental debt to finance acquisitions. Could likely add 1-2x EBITDA in deal-related borrowing.',
  },
  {
    label: 'Competitive Positioning',
    headline: 'Strong in Kitchen, Weak in Smart Home',
    detail: '5 peers benchmarked',
    sentiment: 'neutral' as const,
    body: 'HBB dominates kitchen small appliances but lacks the connected-home capabilities of iRobot and the premium brand positioning of Lovesac. Lifetime Brands represents the closest competitive overlap with a broader kitchenware portfolio. M&A could target smart appliance IP or premium DTC brands to close gaps.',
  },
];

const PULLQUOTES = [
  {
    label: 'Earnings Call Insights',
    headline: 'DTC Push + Margin Focus',
    detail: '4 quarters of consistent messaging',
    sentiment: 'positive' as const,
    quote: 'We are investing in our direct-to-consumer capabilities because we believe that is where the margin opportunity lives. Our Hamilton Beach Health initiative is still early but the customer response has been very encouraging and we see a real path to building a meaningful premium business over time.',
    speaker: 'CEO Scott Tidey',
    context: 'Management has consistently emphasized three strategic themes across recent earnings calls: expanding direct-to-consumer channels, driving margin improvement through operational efficiency, and building the Hamilton Beach Health brand as a premium growth vector.',
  },
  {
    label: 'Analyst Perspectives',
    headline: 'Cautiously Optimistic',
    detail: '3 analysts covering, $32 consensus target',
    sentiment: 'positive' as const,
    quote: 'Can you help us understand the margin trajectory as you ramp the DTC business? It seems like the investment phase should start yielding returns in the back half, but I want to make sure we are modeling the puts and takes correctly.',
    speaker: 'Analyst Adam Bradley, Sidoti & Co.',
    context: 'Analyst coverage is limited but constructive. The consensus price target of $32 implies ~12% upside. Key analyst concerns center on margin timing from the DTC ramp and the competitive response from larger appliance players entering premium kitchen segments.',
  },
];

// ─── Helper Components ────────────────────────────────────────────────────

function SentimentBadge({ sentiment }: { sentiment: 'positive' | 'neutral' | 'negative' }) {
  const config = {
    positive: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Bullish' },
    neutral: { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Neutral' },
    negative: { dot: 'bg-red-400', text: 'text-red-400', label: 'Bearish' },
  };
  const c = config[sentiment];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${c.text}`}>{c.label}</span>
    </span>
  );
}

function formatRevenue(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toFixed(0)}`;
}

// ─── Main Mockup Component ────────────────────────────────────────────────

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

        {/* ── KPI Strip ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {KPI_STRIP.map((kpi) => (
            <div
              key={kpi.label}
              className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl px-5 py-4"
            >
              <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-2">
                {kpi.label}
              </p>
              <div className="flex items-end justify-between">
                <p className="font-mono text-2xl font-bold text-white leading-none">
                  {kpi.value}
                </p>
                <SentimentBadge sentiment={kpi.sentiment} />
              </div>
              <p className="text-xs text-[#64748b] mt-1.5 font-mono">
                {kpi.delta}
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
          {/* Stacked bar */}
          <div className="flex rounded-full overflow-hidden h-3 mb-4">
            {REVENUE_SEGMENTS.map((s, i) => (
              <div
                key={s.name}
                className={`${SEGMENT_COLORS[i]} transition-all`}
                style={{ width: `${s.percent}%` }}
              />
            ))}
          </div>
          {/* Legend row */}
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

        {/* ── Narrative Cards (2-column grid) ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {NARRATIVE_CARDS.map((card) => (
            <div
              key={card.label}
              className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316]">
                  {card.label}
                </p>
                <SentimentBadge sentiment={card.sentiment} />
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <p className="font-mono text-xl font-bold text-white">
                  {card.headline}
                </p>
                <p className="text-xs text-[#64748b]">{card.detail}</p>
              </div>
              <p className="text-sm text-[#94a3b8] leading-relaxed mt-2">
                {card.body}
              </p>
            </div>
          ))}
        </div>

        {/* ── Pullquote Section ─────────────────────────────── */}
        <div className="space-y-5 mb-10">
          {PULLQUOTES.map((pq) => (
            <div
              key={pq.label}
              className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316]">
                    {pq.label}
                  </p>
                  <SentimentBadge sentiment={pq.sentiment} />
                </div>
                <p className="text-xs text-[#64748b]">{pq.detail}</p>
              </div>

              <p className="text-lg font-semibold text-[#e2e8f0] mb-4">
                {pq.headline}
              </p>

              {/* Context paragraph */}
              <p className="text-sm text-[#94a3b8] leading-relaxed mb-4">
                {pq.context}
              </p>

              {/* The pullquote */}
              <blockquote className="border-l-4 border-[#f97316] pl-5 py-3 bg-[#f97316]/[0.04] rounded-r-lg">
                <p className="text-base text-[#e2e8f0] italic leading-relaxed">
                  &ldquo;{pq.quote}&rdquo;
                </p>
                <p className="text-sm text-[#f97316] mt-2 font-medium not-italic">
                  &mdash; {pq.speaker}
                </p>
              </blockquote>
            </div>
          ))}
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
