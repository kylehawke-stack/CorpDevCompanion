import { useState } from 'react';

/* ─── Shared step data ──────────────────────────────────────────────── */
const STEPS = [
  { key: 'analyzing', number: 1, short: 'Analyze', full: 'Company Analysis', color: '#f97316', type: 'system' as const,
    desc: 'Ingests financial statements, earnings calls, analyst coverage, and competitive data.',
    outputs: ['Financial highlights', 'Revenue mix', 'Firepower estimate', 'Earnings insights'] },
  { key: 'peer_benchmarking', number: 2, short: 'Benchmark', full: 'Peer Benchmarking', color: '#3b82f6', type: 'system' as const,
    desc: 'Compares key metrics against selected competitors across valuation, margins, leverage, and firepower.',
    outputs: ['Peer comparison', 'Relative valuation', 'Firepower ranking'] },
  { key: 'voting_step1', number: 3, short: 'Strategy', full: 'Strategic Priorities', color: '#10b981', type: 'team' as const,
    desc: 'Vote on 6 strategic dimensions using quick pairwise comparisons to align the team on M&A direction.',
    outputs: ['Ranked priorities', 'Spectrum positioning', 'Consensus baseline'],
    votes: '~25 comparisons, ~2 min' },
  { key: 'voting_step2', number: 4, short: 'Markets', full: 'Market Segments', color: '#8b5cf6', type: 'team' as const,
    desc: 'Compare system-generated market segments and product categories to narrow where to look.',
    outputs: ['Ranked segments', 'Ranked categories', 'Refined parameters'],
    votes: '~50 comparisons, ~5 min' },
  { key: 'voting_step3', number: 5, short: 'Targets', full: 'Target Companies', color: '#ec4899', type: 'team' as const,
    desc: 'Compare specific acquisition targets head-to-head to build a ranked shortlist.',
    outputs: ['Ranked targets', 'Comparison data', 'Consensus shortlist'],
    votes: 'Open-ended' },
  { key: 'results', number: 6, short: 'Brief', full: 'Strategic Brief', color: '#f97316', type: 'output' as const,
    desc: 'Force-ranked results across all tiers, synthesized into a strategic brief informed by M&A best practices.',
    outputs: ['Force-ranked results', 'Strategic narrative', 'Best practices'] },
];

/* ─── Toggle Component ──────────────────────────────────────────────── */
function OptionToggle({ value, onChange, labels = ['Option A', 'Option B'] }: {
  value: 'a' | 'b';
  onChange: (v: 'a' | 'b') => void;
  labels?: [string, string];
}) {
  return (
    <div className="inline-flex bg-[#0f1419] border border-[#2a3a4e] rounded-lg p-0.5">
      {(['a', 'b'] as const).map((opt, i) => (
        <button
          key={opt}
          className="px-4 py-1.5 text-xs font-semibold rounded-md transition-all"
          style={{
            backgroundColor: value === opt ? '#f97316' : 'transparent',
            color: value === opt ? 'white' : '#64748b',
          }}
          onClick={() => onChange(opt)}
        >
          {labels[i]}
        </button>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   1. HOW IT WORKS -- Option A (vertical timeline) vs Option B (horizontal cards)
   ════════════════════════════════════════════════════════════════════════ */

function HowItWorksA() {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div className="relative">
      <div
        className="absolute left-6 top-0 bottom-0 w-px"
        style={{ background: 'linear-gradient(to bottom, #f97316, #3b82f6, #10b981, #8b5cf6, #ec4899, #f97316)' }}
      />
      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => {
          const isOpen = expanded === i;
          return (
            <div key={step.key} className="relative pl-16">
              <div
                className="absolute left-0 top-3 w-12 h-12 rounded-full flex items-center justify-center border-2 z-10"
                style={{ borderColor: step.color, backgroundColor: '#0f1419' }}
              >
                <span className="font-mono text-lg font-bold" style={{ color: step.color }}>{step.number}</span>
              </div>
              <button
                className="w-full text-left bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-4 hover:border-[#3a4a5e] transition-all"
                style={isOpen ? { borderColor: step.color + '60' } : undefined}
                onClick={() => setExpanded(isOpen ? null : i)}
              >
                <div className="flex items-center gap-3 mb-0.5">
                  <h3 className="text-base font-bold text-white">{('title' in step ? step.title : step.full) as string}</h3>
                  <span
                    className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor: step.type === 'team' ? step.color + '20' : '#2a3a4e',
                      color: step.type === 'team' ? step.color : '#94a3b8',
                    }}
                  >
                    {step.type === 'team' ? 'Team Input' : step.type === 'output' ? 'Output' : 'System'}
                  </span>
                  {step.votes && <span className="text-[10px] font-mono text-[#475569]">{step.votes}</span>}
                </div>
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-[#2a3a4e]">
                    <p className="text-sm text-[#94a3b8] leading-relaxed mb-3">{step.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {step.outputs.map(o => (
                        <span key={o} className="px-2 py-0.5 rounded text-[10px] border"
                          style={{ borderColor: step.color + '30', color: step.color, backgroundColor: step.color + '08' }}>
                          {o}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HowItWorksB() {
  return (
    <div>
      {/* 3-zone layout: System | Team | Output */}
      <div className="flex flex-col gap-6">
        {/* Zone labels */}
        {[
          { label: 'The system does the homework', steps: STEPS.slice(0, 2), zone: 'system' },
          { label: 'Your team sets the direction', steps: STEPS.slice(2, 5), zone: 'team' },
          { label: 'The deliverable', steps: STEPS.slice(5), zone: 'output' },
        ].map((zone) => (
          <div key={zone.label}>
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#64748b] mb-3">{zone.label}</p>
            <div className={`grid gap-3 ${zone.steps.length === 3 ? 'grid-cols-1 md:grid-cols-3' : zone.steps.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {zone.steps.map((step, i) => (
                <div key={step.key} className="relative">
                  <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5 h-full">
                    {/* Number badge */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: step.color + '20', border: `1.5px solid ${step.color}` }}
                      >
                        <span className="font-mono text-xs font-bold" style={{ color: step.color }}>{step.number}</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white leading-none">{step.full}</h3>
                        {step.votes && <p className="text-[10px] font-mono text-[#475569] mt-0.5">{step.votes}</p>}
                      </div>
                    </div>
                    <p className="text-xs text-[#94a3b8] leading-relaxed mb-3">{step.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {step.outputs.map(o => (
                        <span key={o} className="px-2 py-0.5 rounded text-[9px]"
                          style={{ backgroundColor: step.color + '10', color: step.color }}>
                          {o}
                        </span>
                      ))}
                    </div>
                    {/* Funnel narrowing bar */}
                    <div className="mt-4 h-1 rounded-full bg-[#0f1419] overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${100 - (step.number - 1) * 15}%`,
                        backgroundColor: step.color,
                        opacity: 0.6,
                      }} />
                    </div>
                  </div>
                  {/* Horizontal arrow between cards */}
                  {i < zone.steps.length - 1 && (
                    <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                      <svg className="w-6 h-6 text-[#2a3a4e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Downward arrow between zones */}
            {zone.zone !== 'output' && (
              <div className="flex justify-center py-2">
                <svg className="w-5 h-5 text-[#2a3a4e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   2. TRACKER BAR -- Option A (numbered pips) vs Option B (segmented bar)
   ════════════════════════════════════════════════════════════════════════ */

const DEMO_PHASE = 'voting_step1' as const;

function TrackerA({ onClick }: { onClick: () => void }) {
  const currentIdx = STEPS.findIndex(s => s.key === DEMO_PHASE);
  return (
    <button className="flex items-center gap-1 cursor-pointer group" onClick={onClick}>
      {STEPS.map((step, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center"
                style={{ width: isCurrent ? 28 : 18, height: isCurrent ? 28 : 18 }}>
                <div className="absolute inset-0 rounded-full"
                  style={{
                    backgroundColor: isDone ? step.color : isCurrent ? step.color + '20' : '#1a2332',
                    border: isCurrent ? `2px solid ${step.color}` : isDone ? 'none' : '1.5px solid #2a3a4e',
                  }} />
                {isDone ? (
                  <svg className="relative w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="relative text-[9px] font-mono font-bold"
                    style={{ color: isCurrent ? step.color : '#475569' }}>{step.number}</span>
                )}
              </div>
              {isCurrent && <span className="text-[8px] font-semibold mt-0.5" style={{ color: step.color }}>{step.short}</span>}
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-px mx-0.5" style={{ width: 12, backgroundColor: isDone ? STEPS[i + 1].color : '#2a3a4e' }} />
            )}
          </div>
        );
      })}
      <svg className="w-3.5 h-3.5 text-[#475569] ml-1 group-hover:text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  );
}

function TrackerB({ onClick }: { onClick: () => void }) {
  const currentIdx = STEPS.findIndex(s => s.key === DEMO_PHASE);
  return (
    <button className="flex items-center gap-2 cursor-pointer group" onClick={onClick}>
      {/* Continuous segmented bar */}
      <div className="flex items-center h-7 rounded-lg overflow-hidden border border-[#2a3a4e]">
        {STEPS.map((step, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div
              key={step.key}
              className="flex items-center justify-center px-2.5 h-full relative"
              style={{
                backgroundColor: isDone ? step.color : isCurrent ? step.color + '25' : '#0f1419',
                minWidth: isCurrent ? 80 : 32,
                borderRight: i < STEPS.length - 1 ? '1px solid #2a3a4e' : 'none',
              }}
            >
              {isDone ? (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : isCurrent ? (
                <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: step.color }}>{step.short}</span>
              ) : (
                <span className="text-[9px] font-mono" style={{ color: '#475569' }}>{step.number}</span>
              )}
            </div>
          );
        })}
      </div>
      <span className="text-[10px] text-[#475569] group-hover:text-[#94a3b8] transition-colors">
        {currentIdx + 1}/{STEPS.length}
      </span>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   3. POPUP -- Option A (vertical list) vs Option B (horizontal stepper)
   ════════════════════════════════════════════════════════════════════════ */

function PopupA({ onClose }: { onClose: () => void }) {
  const currentIdx = STEPS.findIndex(s => s.key === DEMO_PHASE);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a2332] border border-[#2a3a4e] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a3a4e] sticky top-0 bg-[#1a2332] rounded-t-2xl z-10">
          <div>
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316]">Process Overview</p>
            <p className="text-xs text-[#64748b] mt-0.5">Step {currentIdx + 1} of {STEPS.length}</p>
          </div>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#2a3a4e] text-[#64748b]" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4 flex flex-col gap-2">
          {STEPS.map((step, i) => {
            const isDone = i < currentIdx;
            const isCurrent = i === currentIdx;
            const isFuture = i > currentIdx;
            return (
              <div key={step.key} className="flex items-start gap-4 p-3 rounded-xl"
                style={{
                  backgroundColor: isCurrent ? step.color + '08' : 'transparent',
                  border: isCurrent ? `1px solid ${step.color}30` : '1px solid transparent',
                }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: isDone ? step.color : isCurrent ? step.color + '20' : '#0f1419',
                    border: isCurrent ? `2px solid ${step.color}` : isFuture ? '1.5px solid #2a3a4e' : 'none',
                  }}>
                  {isDone ? (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-xs font-mono font-bold" style={{ color: isCurrent ? step.color : '#475569' }}>{step.number}</span>
                  )}
                </div>
                <div className="pt-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold" style={{ color: isFuture ? '#475569' : '#e2e8f0' }}>{step.full}</h4>
                    {isDone && <span className="text-[9px] font-semibold uppercase text-emerald-400">Complete</span>}
                    {isCurrent && <span className="text-[9px] font-semibold uppercase" style={{ color: step.color }}>Current</span>}
                  </div>
                  {isCurrent && <p className="text-xs text-[#64748b] mt-1">{step.desc}</p>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-6 py-3 border-t border-[#2a3a4e] flex justify-between">
          <p className="text-[10px] text-[#475569]">{STEPS.length - currentIdx - 1} steps remaining</p>
          <button className="text-xs text-[#f97316] font-medium" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function PopupB({ onClose }: { onClose: () => void }) {
  const currentIdx = STEPS.findIndex(s => s.key === DEMO_PHASE);
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a2332] border border-[#2a3a4e] rounded-t-2xl md:rounded-2xl w-full max-w-3xl shadow-2xl">
        {/* Header with inline progress bar */}
        <div className="px-6 py-4 border-b border-[#2a3a4e]">
          <div className="flex items-center justify-between mb-3">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316]">Your Progress</p>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#2a3a4e] text-[#64748b]" onClick={onClose}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Full-width segmented progress */}
          <div className="flex h-2 rounded-full overflow-hidden bg-[#0f1419]">
            {STEPS.map((step, i) => (
              <div key={step.key} className="flex-1" style={{
                backgroundColor: i <= currentIdx ? step.color : 'transparent',
                opacity: i < currentIdx ? 1 : i === currentIdx ? 0.5 : 0,
              }} />
            ))}
          </div>
        </div>

        {/* Horizontal card strip */}
        <div className="px-6 py-5 overflow-x-auto">
          <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
            {STEPS.map((step, i) => {
              const isDone = i < currentIdx;
              const isCurrent = i === currentIdx;
              const isFuture = i > currentIdx;
              return (
                <div key={step.key} className="flex items-center">
                  <div
                    className="w-44 rounded-xl p-4 transition-all shrink-0"
                    style={{
                      backgroundColor: isCurrent ? step.color + '10' : '#0f1419',
                      border: isCurrent ? `1.5px solid ${step.color}` : '1px solid #2a3a4e',
                      opacity: isFuture ? 0.4 : 1,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {isDone ? (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: step.color }}>
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ border: `1.5px solid ${isCurrent ? step.color : '#2a3a4e'}` }}>
                          <span className="text-[8px] font-mono font-bold" style={{ color: isCurrent ? step.color : '#475569' }}>{step.number}</span>
                        </div>
                      )}
                      <span className="text-xs font-bold" style={{ color: isFuture ? '#475569' : '#e2e8f0' }}>{step.short}</span>
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: isFuture ? '#2a3a4e' : '#64748b' }}>
                      {step.desc.substring(0, 80)}...
                    </p>
                    {step.votes && (
                      <p className="text-[9px] font-mono mt-2" style={{ color: isCurrent ? step.color : '#475569' }}>{step.votes}</p>
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <svg className="w-4 h-4 mx-1 shrink-0" style={{ color: isDone ? STEPS[i+1].color : '#2a3a4e' }}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-[#2a3a4e] flex justify-between items-center">
          <p className="text-[10px] text-[#475569]">Step {currentIdx + 1} of {STEPS.length} -- {STEPS[currentIdx].full}</p>
          <button className="text-xs text-[#f97316] font-medium" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Main Comparison Page
   ════════════════════════════════════════════════════════════════════════ */

export function DesignOptionsComparison() {
  const [howItWorks, setHowItWorks] = useState<'a' | 'b'>('a');
  const [tracker, setTracker] = useState<'a' | 'b'>('a');
  const [popup, setPopup] = useState<'a' | 'b'>('a');
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <header className="bg-[#1a2332] border-b border-[#2a3a4e] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">Design Options Comparison</h1>
          <a href="#" className="text-xs text-[#f97316] hover:text-[#fb923c] underline underline-offset-2">Back to Home</a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-16">

        {/* ─── 1. How It Works ─── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">Mockup 1</p>
              <h2 className="text-xl font-bold text-white">How It Works Page</h2>
              <p className="text-xs text-[#64748b] mt-1">
                A: Vertical timeline with expandable cards -- B: Horizontal cards grouped by zone (System / Team / Output)
              </p>
            </div>
            <OptionToggle value={howItWorks} onChange={setHowItWorks} labels={['A: Timeline', 'B: Zones']} />
          </div>
          <div className="bg-[#0f1419] border border-[#2a3a4e] rounded-2xl p-6 md:p-8">
            {howItWorks === 'a' ? <HowItWorksA /> : <HowItWorksB />}
          </div>
        </section>

        {/* ─── 2. Tracker Bar ─── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">Mockup 2</p>
              <h2 className="text-xl font-bold text-white">Header Progress Tracker</h2>
              <p className="text-xs text-[#64748b] mt-1">
                A: Circular pips with connector lines -- B: Continuous segmented bar with active label
              </p>
            </div>
            <OptionToggle value={tracker} onChange={setTracker} labels={['A: Pips', 'B: Bar']} />
          </div>
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-2xl p-5">
            <p className="text-[10px] text-[#475569] mb-3">Shown as it would appear in the header bar (simulated at Step 3):</p>
            <div className="bg-[#0f1419] border border-[#2a3a4e] rounded-xl px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm font-semibold text-white">CorpDev Companion</p>
                  <p className="text-[10px] text-[#64748b]">Hamilton Beach Brands</p>
                </div>
                <div className="w-px h-8 bg-[#2a3a4e]" />
                {tracker === 'a' ? <TrackerA onClick={() => setShowPopup(true)} /> : <TrackerB onClick={() => setShowPopup(true)} />}
              </div>
              <span className="px-3 py-1.5 bg-[#f97316] text-white text-xs font-semibold rounded-lg">Continue</span>
            </div>
          </div>
        </section>

        {/* ─── 3. Popup ─── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">Mockup 3</p>
              <h2 className="text-xl font-bold text-white">Process Popup (on tracker click)</h2>
              <p className="text-xs text-[#64748b] mt-1">
                A: Vertical step list with descriptions -- B: Horizontal scrolling card strip with segmented progress bar
              </p>
            </div>
            <OptionToggle value={popup} onChange={setPopup} labels={['A: Vertical', 'B: Horizontal']} />
          </div>
          <div className="flex justify-center">
            <button
              className="px-6 py-3 bg-[#2a3a4e] text-[#e2e8f0] text-sm font-semibold rounded-lg hover:bg-[#3a4a5e] transition-colors"
              onClick={() => setShowPopup(true)}
            >
              Open Popup (Option {popup.toUpperCase()})
            </button>
          </div>
        </section>
      </main>

      {/* Render selected popup */}
      {showPopup && (
        popup === 'a'
          ? <PopupA onClose={() => setShowPopup(false)} />
          : <PopupB onClose={() => setShowPopup(false)} />
      )}
    </div>
  );
}
