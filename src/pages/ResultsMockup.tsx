/**
 * ResultsMockup.tsx -- Redesigned Strategic Priorities results using segmented bar.
 * Navigate to /#results-mockup to preview.
 *
 * All 6 dimensions stacked full-width. Each card shows a segmented bar
 * divided into labeled zones with an orange position marker. Top-ranked
 * dimensions get an accent border to show visual priority.
 */

interface MockAttribute {
  title: string;
  dimensionIndex: number;
  displayScore: number;
}

interface MockSpectrum {
  dimension: string;
  importanceRank: number;
  importance: number;
  position: number; // 0-1, weighted vote position
  attributes: MockAttribute[];
}

const MOCK_SPECTRUMS: MockSpectrum[] = [
  {
    dimension: 'Integration',
    importanceRank: 1,
    importance: 1347,
    position: 0.58,
    attributes: [
      { title: 'Full Integration', dimensionIndex: 0, displayScore: 1180 },
      { title: 'Shared Services', dimensionIndex: 1, displayScore: 1290 },
      { title: 'Brand Portfolio', dimensionIndex: 2, displayScore: 1420 },
      { title: 'Standalone Operations', dimensionIndex: 3, displayScore: 1310 },
    ],
  },
  {
    dimension: 'Growth Objective',
    importanceRank: 2,
    importance: 949,
    position: 0.37,
    attributes: [
      { title: 'Market Share Consolidation', dimensionIndex: 0, displayScore: 910 },
      { title: 'Category Extension', dimensionIndex: 1, displayScore: 980 },
      { title: 'Channel Diversification', dimensionIndex: 2, displayScore: 940 },
      { title: 'Technology Integration', dimensionIndex: 3, displayScore: 920 },
      { title: 'Platform Transformation', dimensionIndex: 4, displayScore: 870 },
    ],
  },
  {
    dimension: 'Target Profile',
    importanceRank: 3,
    importance: 945,
    position: 0.35,
    attributes: [
      { title: 'Established Brands', dimensionIndex: 0, displayScore: 960 },
      { title: 'Complementary Players', dimensionIndex: 1, displayScore: 990 },
      { title: 'Manufacturing Assets', dimensionIndex: 2, displayScore: 930 },
      { title: 'Innovation Leaders', dimensionIndex: 3, displayScore: 910 },
      { title: 'Emerging Disruptors', dimensionIndex: 4, displayScore: 880 },
    ],
  },
  {
    dimension: 'Deal Size',
    importanceRank: 4,
    importance: 870,
    position: 0.28,
    attributes: [
      { title: 'Tuck-in (<$50M)', dimensionIndex: 0, displayScore: 920 },
      { title: 'Mid-Market ($50-200M)', dimensionIndex: 1, displayScore: 890 },
      { title: 'Large ($200M-1B)', dimensionIndex: 2, displayScore: 830 },
      { title: 'Transformational (>$1B)', dimensionIndex: 3, displayScore: 790 },
    ],
  },
  {
    dimension: 'Geographic Focus',
    importanceRank: 5,
    importance: 820,
    position: 0.22,
    attributes: [
      { title: 'Domestic Core', dimensionIndex: 0, displayScore: 890 },
      { title: 'North America', dimensionIndex: 1, displayScore: 860 },
      { title: 'Developed Markets', dimensionIndex: 2, displayScore: 810 },
      { title: 'Emerging Markets', dimensionIndex: 3, displayScore: 750 },
    ],
  },
  {
    dimension: 'Value Creation',
    importanceRank: 6,
    importance: 780,
    position: 0.45,
    attributes: [
      { title: 'Cost Synergies', dimensionIndex: 0, displayScore: 810 },
      { title: 'Revenue Synergies', dimensionIndex: 1, displayScore: 790 },
      { title: 'Capability Acquisition', dimensionIndex: 2, displayScore: 770 },
      { title: 'Market Access', dimensionIndex: 3, displayScore: 760 },
    ],
  },
];

/* ── Rank Badge ─────────────────────────────────────────────────────── */

function RankBadge({ rank }: { rank: number }) {
  const isTop = rank <= 3;
  return (
    <span
      className={`
        inline-flex items-center justify-center w-8 h-8 rounded-lg font-mono text-sm font-bold
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
  const segWidth = 100 / segments.length;
  const activeIdx = Math.min(
    Math.floor(spectrum.position * segments.length),
    segments.length - 1
  );

  return (
    <div className="mt-4">
      {/* Axis labels */}
      <div className="flex justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-[#94a3b8] font-medium">
          Conservative
        </span>
        <span className="text-[10px] uppercase tracking-widest text-[#94a3b8] font-medium">
          Aggressive
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

        {/* Orange position dot -- absolutely positioned on the bar */}
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
      {/* Header: rank, name, score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RankBadge rank={spectrum.importanceRank} />
          <h3 className="text-white font-semibold text-lg">
            {spectrum.dimension}
          </h3>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm text-[#e2e8f0]">
            {Math.round(spectrum.importance)}
          </p>
          <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider">
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
            6 strategic dimensions ranked by team consensus. Each bar shows the
            spectrum of options from conservative to aggressive, with the orange
            marker at the team's weighted position.
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
