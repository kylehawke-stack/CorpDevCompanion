/**
 * ResultsMockup.tsx — Static mockup of the redesigned Strategic Priorities results view.
 * Navigate to /#results-mockup to preview.
 *
 * Design goals:
 * - Compact, editorial layout following Bloomberg theme
 * - Each dimension is a tighter card with a refined spectrum slider
 * - Rank badge fades for lower ranks; top 3 get visual emphasis
 * - Spectrum uses a gradient track with a glowing position indicator
 * - Attribute labels sit on the track as tick marks rather than floating dots
 * - Two-column layout for dimensions 3-6 to reduce vertical scroll
 */

// --- Mock data based on the HBB screenshot ---

interface MockAttribute {
  title: string;
  dimensionIndex: number;
  displayScore: number;
}

interface MockSpectrum {
  dimension: string;
  importanceRank: number;
  importance: number;
  position: number; // 0–1
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

// --- Components ---

function RankBadge({ rank }: { rank: number }) {
  const isTop = rank <= 3;
  return (
    <span
      className={`
        inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono text-sm font-bold
        ${isTop
          ? 'bg-accent/15 text-accent border border-accent/30'
          : 'bg-surface-elevated text-dimmed border border-edge'
        }
      `}
    >
      {rank}
    </span>
  );
}

function SpectrumTrack({ spectrum }: { spectrum: MockSpectrum }) {
  const maxIdx = Math.max(...spectrum.attributes.map((a) => a.dimensionIndex), 1);

  return (
    <div className="mt-4 mb-2">
      {/* Conservative / Aggressive labels */}
      <div className="flex justify-between text-[10px] uppercase tracking-widest mb-2.5">
        <span className="text-muted">Conservative</span>
        <span className="text-muted">Aggressive</span>
      </div>

      {/* Track */}
      <div className="relative h-10">
        {/* Background track line */}
        <div className="absolute top-[18px] left-0 right-0 h-[2px] bg-edge rounded-full" />

        {/* Filled portion from left to position */}
        <div
          className="absolute top-[18px] left-0 h-[2px] bg-accent/40 rounded-full"
          style={{ width: `${spectrum.position * 100}%` }}
        />

        {/* Attribute tick marks + dots */}
        {spectrum.attributes.map((attr) => {
          const pct = maxIdx === 0 ? 50 : (attr.dimensionIndex / maxIdx) * 100;
          return (
            <div
              key={attr.title}
              className="absolute -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${pct}%`, top: '12px' }}
            >
              {/* Tick dot */}
              <div className="w-2 h-2 rounded-full bg-edge-light border border-surface-card" />
              {/* Tick line */}
              <div className="w-px h-2 bg-edge-light mt-0.5" />
            </div>
          );
        })}

        {/* User position indicator */}
        <div
          className="absolute -translate-x-1/2 z-10"
          style={{ left: `${spectrum.position * 100}%`, top: '10px' }}
        >
          <div className="w-4 h-4 rounded-full bg-accent shadow-[0_0_8px_rgba(249,115,22,0.5)] border-2 border-surface-card" />
        </div>
      </div>

      {/* Attribute labels */}
      <div className="relative h-9 mt-1.5">
        {spectrum.attributes.map((attr) => {
          const pct = maxIdx === 0 ? 50 : (attr.dimensionIndex / maxIdx) * 100;
          return (
            <div
              key={attr.title}
              className="absolute -translate-x-1/2 text-[10px] text-dimmed leading-tight text-center"
              style={{ left: `${pct}%`, maxWidth: '72px' }}
            >
              {attr.title}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DimensionCard({ spectrum, variant = 'default' }: { spectrum: MockSpectrum; variant?: 'featured' | 'default' }) {
  const isFeatured = variant === 'featured';
  return (
    <div
      className={`
        bg-surface-card border rounded-xl transition-colors
        ${isFeatured
          ? 'border-accent/30 p-5'
          : 'border-edge p-4 hover:border-edge-light'
        }
      `}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <RankBadge rank={spectrum.importanceRank} />
          <h3 className={`font-semibold text-heading ${isFeatured ? 'text-base' : 'text-sm'}`}>
            {spectrum.dimension}
          </h3>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs text-muted">
            {Math.round(spectrum.importance)}
          </p>
          <p className="text-[10px] text-dimmed uppercase tracking-wider">score</p>
        </div>
      </div>

      {/* Spectrum */}
      <SpectrumTrack spectrum={spectrum} />
    </div>
  );
}

// --- Main Page ---

export function ResultsMockup() {
  const top2 = MOCK_SPECTRUMS.slice(0, 2);
  const rest = MOCK_SPECTRUMS.slice(2);

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Header */}
      <header className="bg-surface-card border-b border-edge px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-heading">CorpDev Companion</h1>
            <p className="text-xs text-muted">
              Hamilton Beach Brands Holding Company &mdash; 3/2/2026 &middot; 25 votes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors">
              Continue Voting
            </button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-heading transition-colors">
              New Session
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Section header */}
        <div className="mb-6">
          <p className="uppercase tracking-widest text-[10px] font-semibold text-accent mb-1">
            Strategic Priorities
          </p>
          <h2 className="text-2xl font-bold text-heading">
            Force-Ranked M&A Dimensions
          </h2>
          <p className="text-sm text-muted mt-1">
            6 strategic dimensions ranked by team consensus, with positioning from conservative to aggressive.
          </p>
        </div>

        {/* Tier filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
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
                  ? 'bg-accent/15 text-accent border-accent/30 ring-2 ring-offset-1 ring-offset-surface-base ring-accent'
                  : 'bg-surface-elevated text-muted border-edge hover:bg-surface-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Top 2 — featured, full width stacked */}
        <div className="space-y-4 mb-4">
          {top2.map((s) => (
            <DimensionCard key={s.dimension} spectrum={s} variant="featured" />
          ))}
        </div>

        {/* Remaining 4 — 2-column grid, compact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {rest.map((s) => (
            <DimensionCard key={s.dimension} spectrum={s} />
          ))}
        </div>

        {/* Footer note */}
        <p className="text-[10px] text-dimmed">
          Scores use Bradley-Terry MLE displayed as Elo-equivalent ratings (median = 1500). 95% confidence intervals via Fisher information.
        </p>

        {/* Back to app link */}
        <div className="mt-8 text-center">
          <a
            href="#"
            className="text-xs text-accent hover:text-accent-hover underline underline-offset-2 transition-colors"
          >
            Back to app
          </a>
        </div>
      </main>
    </div>
  );
}
