/**
 * Side-by-side comparison of 4 spectrum visualization approaches.
 * All use the same "Integration" dimension data from the HBB session.
 * Navigate to /#spectrum-compare to view.
 */

const DIMENSION = {
  rank: 1,
  name: 'Integration',
  score: 1347,
  position: 0.55, // weighted position (0 = full conservative, 1 = full aggressive)
  attributes: [
    'Full Integration',
    'Shared Services',
    'Brand Portfolio',
    'Standalone Operations',
  ],
};

/* ──────────────────────────────────────────────────────────────────── */
/*  Option A: Segmented Bar                                           */
/* ──────────────────────────────────────────────────────────────────── */
function SegmentedBar() {
  const segments = DIMENSION.attributes;
  const posPercent = DIMENSION.position * 100;

  return (
    <div>
      <p className="text-[#94a3b8] text-sm mb-4 leading-relaxed">
        A horizontal bar split into labeled segments. The orange marker shows
        where votes landed. Each segment is labeled inside the bar -- nothing
        clips off the edges.
      </p>
      <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#f97316]/20 text-[#f97316] text-sm font-bold font-mono">
              {DIMENSION.rank}
            </span>
            <span className="text-white font-semibold text-lg">{DIMENSION.name}</span>
          </div>
          <span className="font-mono text-sm text-[#94a3b8]">Score {DIMENSION.score}</span>
        </div>

        {/* Axis labels */}
        <div className="flex justify-between mb-2">
          <span className="text-[10px] uppercase tracking-widest text-[#64748b]">Conservative</span>
          <span className="text-[10px] uppercase tracking-widest text-[#64748b]">Aggressive</span>
        </div>

        {/* Segmented bar */}
        <div className="relative">
          <div className="flex h-10 rounded-lg overflow-hidden border border-[#2a3a4e]">
            {segments.map((seg, i) => (
              <div
                key={seg}
                className="flex items-center justify-center border-r border-[#2a3a4e] last:border-r-0"
                style={{
                  flex: 1,
                  backgroundColor: i === Math.round(DIMENSION.position * (segments.length - 1))
                    ? 'rgba(249,115,22,0.15)'
                    : 'rgba(26,35,50,0.8)',
                }}
              >
                <span className="text-[11px] text-[#cbd5e1] font-medium px-1 text-center leading-tight">
                  {seg}
                </span>
              </div>
            ))}
          </div>

          {/* Position marker */}
          <div
            className="absolute top-0 h-10 flex items-center pointer-events-none"
            style={{ left: `${posPercent}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-3 h-3 rounded-full bg-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
          </div>
          {/* Triangle pointer below */}
          <div
            className="absolute -bottom-2 pointer-events-none"
            style={{ left: `${posPercent}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#f97316]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Option B: Dot Plot + Side Legend                                   */
/* ──────────────────────────────────────────────────────────────────── */
function DotPlotLegend() {
  const segments = DIMENSION.attributes;
  const posPercent = DIMENSION.position * 100;

  return (
    <div>
      <p className="text-[#94a3b8] text-sm mb-4 leading-relaxed">
        The dot-on-a-line stays, but attribute labels move into a legend table
        on the right instead of cramming under the track. Cleaner, nothing overflows.
      </p>
      <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#f97316]/20 text-[#f97316] text-sm font-bold font-mono">
              {DIMENSION.rank}
            </span>
            <span className="text-white font-semibold text-lg">{DIMENSION.name}</span>
          </div>
          <span className="font-mono text-sm text-[#94a3b8]">Score {DIMENSION.score}</span>
        </div>

        <div className="flex gap-6">
          {/* Track */}
          <div className="flex-1">
            <div className="flex justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-[#64748b]">Conservative</span>
              <span className="text-[10px] uppercase tracking-widest text-[#64748b]">Aggressive</span>
            </div>
            <div className="relative h-6 flex items-center">
              {/* Background track */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-[#2a3a4e]" />
              {/* Filled portion */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-gradient-to-r from-[#f97316]/40 to-[#f97316]"
                style={{ left: 0, width: `${posPercent}%` }}
              />
              {/* Tick marks */}
              {segments.map((_, i) => {
                const pct = (i / (segments.length - 1)) * 100;
                return (
                  <div
                    key={i}
                    className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#475569]"
                    style={{ left: `${pct}%`, transform: 'translate(-50%, -50%)' }}
                  />
                );
              })}
              {/* Position dot */}
              <div
                className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-[#f97316] shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                style={{ left: `${posPercent}%`, transform: 'translate(-50%, -50%)' }}
              />
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-1 min-w-[160px]">
            {segments.map((seg) => (
              <div key={seg} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#475569] flex-shrink-0" />
                <span className="text-xs text-[#94a3b8]">{seg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Option C: Discrete Option Chips                                    */
/* ──────────────────────────────────────────────────────────────────── */
function DiscreteChips() {
  const segments = DIMENSION.attributes;
  const selectedIdx = Math.round(DIMENSION.position * (segments.length - 1));

  return (
    <div>
      <p className="text-[#94a3b8] text-sm mb-4 leading-relaxed">
        Each option is a chip, laid out left (conservative) to right (aggressive).
        The winning position gets the orange highlight. Reads like a ballot result.
      </p>
      <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#f97316]/20 text-[#f97316] text-sm font-bold font-mono">
              {DIMENSION.rank}
            </span>
            <span className="text-white font-semibold text-lg">{DIMENSION.name}</span>
          </div>
          <span className="font-mono text-sm text-[#94a3b8]">Score {DIMENSION.score}</span>
        </div>

        {/* Axis labels */}
        <div className="flex justify-between mb-3">
          <span className="text-[10px] uppercase tracking-widest text-[#64748b]">Conservative</span>
          <span className="text-[10px] uppercase tracking-widest text-[#64748b]">Aggressive</span>
        </div>

        {/* Chips row */}
        <div className="flex gap-2">
          {segments.map((seg, i) => {
            const isSelected = i === selectedIdx;
            return (
              <div
                key={seg}
                className={`flex-1 text-center py-3 px-2 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-[#f97316]/15 border-[#f97316] text-white'
                    : 'bg-[#0f1419]/60 border-[#2a3a4e] text-[#94a3b8]'
                }`}
              >
                <span className="text-xs font-medium leading-tight block">{seg}</span>
                {isSelected && (
                  <span className="text-[10px] text-[#f97316] font-mono mt-1 block">Selected</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Option D: Fixed Original Style                                     */
/* ──────────────────────────────────────────────────────────────────── */
function FixedOriginal() {
  const segments = DIMENSION.attributes;
  const posPercent = DIMENSION.position * 100;

  return (
    <div>
      <p className="text-[#94a3b8] text-sm mb-4 leading-relaxed">
        Same dot-on-a-line with labels underneath, but with fixed contrast,
        proper spacing, and no overflow. All dimensions stay full-width stacked.
      </p>
      <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#f97316]/20 text-[#f97316] text-sm font-bold font-mono">
              {DIMENSION.rank}
            </span>
            <span className="text-white font-semibold text-lg">{DIMENSION.name}</span>
          </div>
          <span className="font-mono text-sm text-[#94a3b8]">Score {DIMENSION.score}</span>
        </div>

        {/* Axis labels */}
        <div className="flex justify-between mb-2">
          <span className="text-[10px] uppercase tracking-widest text-[#64748b]">Conservative</span>
          <span className="text-[10px] uppercase tracking-widest text-[#64748b]">Aggressive</span>
        </div>

        {/* Track */}
        <div className="relative px-4">
          <div className="relative h-6 flex items-center">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#2a3a4e]" />
            {/* Tick marks with labels */}
            {segments.map((seg, i) => {
              const pct = (i / (segments.length - 1)) * 100;
              return (
                <div
                  key={seg}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-2 h-2 rounded-full bg-[#475569]" />
                  <span className="text-[11px] text-[#94a3b8] mt-3 whitespace-nowrap">{seg}</span>
                </div>
              );
            })}
            {/* Position dot */}
            <div
              className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-[#f97316] shadow-[0_0_10px_rgba(249,115,22,0.5)] z-10"
              style={{ left: `${posPercent}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Comparison Page                                                    */
/* ──────────────────────────────────────────────────────────────────── */
export function SpectrumComparison() {
  return (
    <div className="min-h-screen bg-[#0f1419] text-[#e2e8f0]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="mb-10">
          <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-2">
            Design Comparison
          </p>
          <h1 className="text-2xl font-bold text-white mb-2">
            Spectrum Visualization Options
          </h1>
          <p className="text-sm text-[#94a3b8]">
            All four options show the same data: Integration ranked #1 with a score of 1347,
            positioned between Shared Services and Brand Portfolio.
          </p>
        </div>

        <div className="space-y-10">
          {/* Option A */}
          <section>
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-[#f97316] font-mono">A</span>
              Segmented Bar
            </h2>
            <SegmentedBar />
          </section>

          {/* Option B */}
          <section>
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-[#f97316] font-mono">B</span>
              Dot Plot + Side Legend
            </h2>
            <DotPlotLegend />
          </section>

          {/* Option C */}
          <section>
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-[#f97316] font-mono">C</span>
              Discrete Option Chips
            </h2>
            <DiscreteChips />
          </section>

          {/* Option D */}
          <section>
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-[#f97316] font-mono">D</span>
              Fixed Original Style
            </h2>
            <FixedOriginal />
          </section>
        </div>

        {/* Back link */}
        <div className="mt-10 text-center">
          <a
            href="#"
            className="text-xs text-[#f97316] hover:text-[#fb923c] underline underline-offset-2 transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
