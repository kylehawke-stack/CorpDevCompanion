/**
 * ResultsMockup.tsx -- Redesigned Strategic Priorities results using segmented bar.
 * Navigate to /#results-mockup to preview.
 *
 * All 6 dimensions stacked full-width. Each card shows:
 *   - Rank badge + dimension name + short description
 *   - Segmented bar with labeled zones + orange position marker
 *   - Left/right axis labels describe what the ends of the spectrum mean
 */

interface MockAttribute {
  title: string;
  dimensionIndex: number;
  displayScore: number;
}

interface MockSpectrum {
  dimension: string;
  description: string;    // What this dimension measures
  leftLabel: string;      // What the left end means
  rightLabel: string;     // What the right end means
  importanceRank: number;
  importance: number;
  position: number;       // 0-1, weighted vote position
  attributes: MockAttribute[];
}

const MOCK_SPECTRUMS: MockSpectrum[] = [
  {
    dimension: 'Integration',
    description: 'How tightly do you integrate?',
    leftLabel: 'Full absorption',
    rightLabel: 'Arm\'s length',
    importanceRank: 1,
    importance: 1347,
    position: 0.58,
    attributes: [
      { title: 'Full Absorption', dimensionIndex: 0, displayScore: 1180 },
      { title: 'Shared Backbone', dimensionIndex: 1, displayScore: 1290 },
      { title: 'Operate Independently', dimensionIndex: 2, displayScore: 1420 },
      { title: 'Arm\'s Length', dimensionIndex: 3, displayScore: 1310 },
    ],
  },
  {
    dimension: 'Growth Objective',
    description: 'Why are you acquiring?',
    leftLabel: 'Defensive / incremental',
    rightLabel: 'Transformational',
    importanceRank: 2,
    importance: 949,
    position: 0.37,
    attributes: [
      { title: 'Protect What We Have', dimensionIndex: 0, displayScore: 910 },
      { title: 'Get Bigger at What We Do', dimensionIndex: 1, displayScore: 980 },
      { title: 'Fill Gaps in Our Lineup', dimensionIndex: 2, displayScore: 940 },
      { title: 'Enter New Markets', dimensionIndex: 3, displayScore: 920 },
      { title: 'Reinvent the Business', dimensionIndex: 4, displayScore: 870 },
    ],
  },
  {
    dimension: 'Target Profile',
    description: 'What kind of company fits?',
    leftLabel: 'Established / proven',
    rightLabel: 'Unproven / innovative',
    importanceRank: 3,
    importance: 945,
    position: 0.35,
    attributes: [
      { title: 'Proven Operators', dimensionIndex: 0, displayScore: 960 },
      { title: 'Brand-Led Businesses', dimensionIndex: 1, displayScore: 990 },
      { title: 'Capability Specialists', dimensionIndex: 2, displayScore: 930 },
      { title: 'Fast Growers', dimensionIndex: 3, displayScore: 910 },
      { title: 'Category Creators', dimensionIndex: 4, displayScore: 880 },
    ],
  },
  {
    dimension: 'Deal Approach',
    description: 'How do you want to build the portfolio?',
    leftLabel: 'Few big moves',
    rightLabel: 'Many smaller deals',
    importanceRank: 4,
    importance: 870,
    position: 0.28,
    attributes: [
      { title: 'One Big Move', dimensionIndex: 0, displayScore: 920 },
      { title: 'A Few Targeted Bets', dimensionIndex: 1, displayScore: 890 },
      { title: 'Steady Stream of Deals', dimensionIndex: 2, displayScore: 830 },
      { title: 'Mix of Big and Small', dimensionIndex: 3, displayScore: 790 },
    ],
  },
  {
    dimension: 'Deal Structure',
    description: 'How do you structure the relationship?',
    leftLabel: 'Full ownership',
    rightLabel: 'Minority / partnerships',
    importanceRank: 5,
    importance: 820,
    position: 0.42,
    attributes: [
      { title: 'Full Acquisitions Only', dimensionIndex: 0, displayScore: 850 },
      { title: 'Majority Stakes', dimensionIndex: 1, displayScore: 830 },
      { title: 'Joint Ventures', dimensionIndex: 2, displayScore: 810 },
      { title: 'Minority Investments', dimensionIndex: 3, displayScore: 790 },
    ],
  },
  {
    dimension: 'Strategic Proximity',
    description: 'How far from your core business?',
    leftLabel: 'Core',
    rightLabel: 'New territory',
    importanceRank: 6,
    importance: 780,
    position: 0.45,
    attributes: [
      { title: 'Strengthen the Core', dimensionIndex: 0, displayScore: 810 },
      { title: 'Adjacent Spaces', dimensionIndex: 1, displayScore: 790 },
      { title: 'New-to-Company Territory', dimensionIndex: 2, displayScore: 770 },
      { title: 'Completely New Direction', dimensionIndex: 3, displayScore: 760 },
    ],
  },
];

/* ── Rank Badge ─────────────────────────────────────────────────────── */

function RankBadge({ rank }: { rank: number }) {
  const isTop = rank <= 3;
  return (
    <span
      className={`
        inline-flex items-center justify-center w-8 h-8 rounded-lg font-mono text-sm font-bold shrink-0
        ${isTop
          ? 'bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/30'
          : 'bg-[#1e293b] text-[#94a3b8] border border-[#2a3a4e]'
        }
      `}
    >
      {rank}
    </span>
  );
}

/* ── Segmented Bar ──────────────────────────────────────────────────── */

function SegmentedBar({ spectrum }: { spectrum: MockSpectrum }) {
  const segments = spectrum.attributes;
  const posPercent = spectrum.position * 100;

  // Which segment does the position fall in?
  const activeIdx = Math.min(
    Math.floor(spectrum.position * segments.length),
    segments.length - 1
  );

  return (
    <div className="mt-4">
      {/* Axis labels -- dimension-specific descriptions */}
      <div className="flex justify-between mb-2">
        <span className="text-[11px] text-[#94a3b8]">
          {spectrum.leftLabel}
        </span>
        <span className="text-[11px] text-[#94a3b8]">
          {spectrum.rightLabel}
        </span>
      </div>

      {/* Segmented bar with position marker */}
      <div className="relative">
        {/* Segments */}
        <div className="flex rounded-lg overflow-hidden border border-[#2a3a4e]">
          {segments.map((seg, i) => {
            const isActive = i === activeIdx;
            return (
              <div
                key={seg.title}
                className="flex items-center justify-center border-r border-[#2a3a4e] last:border-r-0"
                style={{
                  flex: 1,
                  height: '44px',
                  backgroundColor: isActive
                    ? 'rgba(249, 115, 22, 0.12)'
                    : 'rgba(15, 20, 25, 0.6)',
                }}
              >
                <span
                  className={`text-[11px] font-medium px-1.5 text-center leading-tight ${
                    isActive ? 'text-[#f97316]' : 'text-[#94a3b8]'
                  }`}
                >
                  {seg.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Orange position dot */}
        <div
          className="absolute top-0 pointer-events-none flex items-center justify-center"
          style={{
            left: `${posPercent}%`,
            transform: 'translateX(-50%)',
            height: '44px',
          }}
        >
          <div
            className="w-3.5 h-3.5 rounded-full bg-[#f97316] border-2 border-[#0f1419]"
            style={{ boxShadow: '0 0 10px rgba(249, 115, 22, 0.6)' }}
          />
        </div>

        {/* Triangle pointer below the bar */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${posPercent}%`,
            transform: 'translateX(-50%)',
            top: '44px',
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #f97316',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Dimension Card ─────────────────────────────────────────────────── */

function DimensionCard({ spectrum }: { spectrum: MockSpectrum }) {
  const isTop = spectrum.importanceRank <= 2;

  return (
    <div
      className={`bg-[#1a2332] rounded-xl border p-6 ${
        isTop ? 'border-[#f97316]/25' : 'border-[#2a3a4e]'
      }`}
    >
      {/* Header: rank, name, description, score */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <RankBadge rank={spectrum.importanceRank} />
          <div>
            <h3 className="text-[#e2e8f0] font-semibold text-lg leading-tight">
              {spectrum.dimension}
            </h3>
            <p className="text-[13px] text-[#94a3b8] mt-0.5">
              {spectrum.description}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-sm text-[#e2e8f0]">
            {Math.round(spectrum.importance)}
          </p>
          <p className="text-[10px] text-[#64748b] uppercase tracking-wider">
            score
          </p>
        </div>
      </div>

      {/* Segmented spectrum bar */}
      <SegmentedBar spectrum={spectrum} />
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

export function ResultsMockup() {
  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e2e8f0]">
      {/* Header bar */}
      <header className="bg-[#1a2332] border-b border-[#2a3a4e] px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">CorpDev Companion</h1>
            <p className="text-xs text-[#94a3b8]">
              {'Hamilton Beach Brands Holding Company \u2014 3/2/2026 \u00B7 25 votes'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg text-sm font-medium bg-[#f97316] text-white hover:bg-[#ea580c] transition-colors">
              Continue Voting
            </button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-[#94a3b8] hover:text-white transition-colors">
              New Session
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Section heading */}
        <div className="mb-6">
          <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">
            Strategic Priorities
          </p>
          <h2 className="text-2xl font-bold text-white mb-1">
            Force-Ranked M&A Dimensions
          </h2>
          <p className="text-sm text-[#94a3b8]">
            6 strategic dimensions ranked by team consensus. The bar shows the
            spectrum of options with the orange marker at the team's weighted
            position.
          </p>
        </div>

        {/* Tier filter pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { label: 'All Tiers', active: false },
            { label: 'Strategic Priorities', active: true },
            { label: 'Market Segments', active: false },
            { label: 'Product Categories', active: false },
            { label: 'Specific Companies', active: false },
          ].map((tab) => (
            <button
              key={tab.label}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                tab.active
                  ? 'bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30'
                  : 'bg-[#1e293b] text-[#94a3b8] border-[#2a3a4e] hover:border-[#475569]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* All dimensions stacked full-width */}
        <div className="space-y-4">
          {MOCK_SPECTRUMS.map((s) => (
            <DimensionCard key={s.dimension} spectrum={s} />
          ))}
        </div>

        {/* Footer note */}
        <p className="text-[11px] text-[#64748b] mt-6">
          Scores use Bradley-Terry MLE displayed as Elo-equivalent ratings
          (median = 1500). 95% confidence intervals via Fisher information.
        </p>

        {/* Back link */}
        <div className="mt-8 text-center">
          <a
            href="#"
            className="text-xs text-[#f97316] hover:text-[#fb923c] underline underline-offset-2 transition-colors"
          >
            Back to app
          </a>
        </div>
      </main>
    </div>
  );
}
