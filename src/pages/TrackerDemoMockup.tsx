import { useState } from 'react';

/* ─── Step definitions ──────────────────────────────────────────────── */
const STEPS = [
  { key: 'analyzing', number: 1, short: 'Analyze', full: 'Company Analysis', color: '#f97316' },
  { key: 'peer_benchmarking', number: 2, short: 'Benchmark', full: 'Peer Benchmarking', color: '#3b82f6' },
  { key: 'voting_step1', number: 3, short: 'Strategy', full: 'Strategic Priorities', color: '#10b981' },
  { key: 'voting_step2', number: 4, short: 'Markets', full: 'Market Segments', color: '#8b5cf6' },
  { key: 'voting_step3', number: 5, short: 'Targets', full: 'Target Companies', color: '#ec4899' },
  { key: 'results', number: 6, short: 'Brief', full: 'Strategic Brief', color: '#f97316' },
] as const;

type PhaseKey = (typeof STEPS)[number]['key'];

function getStepIndex(phase: PhaseKey): number {
  return STEPS.findIndex((s) => s.key === phase);
}

/* ─── Progress Tracker Bar (goes in header) ─────────────────────────── */
function ProgressTracker({
  currentPhase,
  onClick,
}: {
  currentPhase: PhaseKey;
  onClick: () => void;
}) {
  const currentIdx = getStepIndex(currentPhase);

  return (
    <button
      className="flex items-center gap-1 cursor-pointer group"
      onClick={onClick}
      title="View full process"
    >
      {STEPS.map((step, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isFuture = i > currentIdx;

        return (
          <div key={step.key} className="flex items-center">
            {/* Step pip */}
            <div className="flex flex-col items-center">
              <div
                className="relative flex items-center justify-center transition-all"
                style={{
                  width: isCurrent ? 28 : 18,
                  height: isCurrent ? 28 : 18,
                }}
              >
                {/* Ring / fill */}
                <div
                  className="absolute inset-0 rounded-full transition-all"
                  style={{
                    backgroundColor: isDone ? step.color : isCurrent ? step.color + '20' : '#1a2332',
                    border: isCurrent
                      ? `2px solid ${step.color}`
                      : isDone
                        ? 'none'
                        : '1.5px solid #2a3a4e',
                  }}
                />

                {/* Content */}
                {isDone ? (
                  <svg
                    className="relative w-2.5 h-2.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <span
                    className="relative text-[9px] font-mono font-bold"
                    style={{ color: step.color }}
                  >
                    {step.number}
                  </span>
                ) : (
                  <span className="relative text-[8px] font-mono text-[#475569]">
                    {step.number}
                  </span>
                )}
              </div>

              {/* Label - only on current */}
              {isCurrent && (
                <span
                  className="text-[8px] font-semibold mt-0.5 whitespace-nowrap"
                  style={{ color: step.color }}
                >
                  {step.short}
                </span>
              )}
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className="h-px transition-all mx-0.5"
                style={{
                  width: 12,
                  backgroundColor: isDone ? STEPS[i + 1].color : '#2a3a4e',
                  opacity: isFuture ? 0.3 : 1,
                }}
              />
            )}
          </div>
        );
      })}

      {/* Hover hint */}
      <svg
        className="w-3.5 h-3.5 text-[#475569] ml-1 group-hover:text-[#94a3b8] transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </button>
  );
}

/* ─── Process Popup (modal on click) ────────────────────────────────── */
function ProcessPopup({
  currentPhase,
  onClose,
}: {
  currentPhase: PhaseKey;
  onClose: () => void;
}) {
  const currentIdx = getStepIndex(currentPhase);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#1a2332] border border-[#2a3a4e] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a3a4e] sticky top-0 bg-[#1a2332] rounded-t-2xl z-10">
          <div>
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316]">
              Process Overview
            </p>
            <p className="text-xs text-[#64748b] mt-0.5">
              Step {currentIdx + 1} of {STEPS.length}
            </p>
          </div>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#2a3a4e] transition-colors text-[#64748b] hover:text-[#e2e8f0]"
            onClick={onClose}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Steps list */}
        <div className="px-6 py-4">
          <div className="flex flex-col gap-2">
            {STEPS.map((step, i) => {
              const isDone = i < currentIdx;
              const isCurrent = i === currentIdx;
              const isFuture = i > currentIdx;

              return (
                <div key={step.key}>
                  <div
                    className="flex items-start gap-4 p-3 rounded-xl transition-all"
                    style={{
                      backgroundColor: isCurrent ? step.color + '08' : 'transparent',
                      border: isCurrent ? `1px solid ${step.color}30` : '1px solid transparent',
                    }}
                  >
                    {/* Step indicator */}
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: isDone
                            ? step.color
                            : isCurrent
                              ? step.color + '20'
                              : '#0f1419',
                          border: isCurrent
                            ? `2px solid ${step.color}`
                            : isFuture
                              ? '1.5px solid #2a3a4e'
                              : 'none',
                        }}
                      >
                        {isDone ? (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span
                            className="text-xs font-mono font-bold"
                            style={{ color: isCurrent ? step.color : '#475569' }}
                          >
                            {step.number}
                          </span>
                        )}
                      </div>

                      {/* Vertical connector */}
                      {i < STEPS.length - 1 && (
                        <div
                          className="w-px h-3 mt-1"
                          style={{
                            backgroundColor: isDone ? STEPS[i + 1].color : '#2a3a4e',
                          }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className="text-sm font-semibold"
                          style={{
                            color: isFuture ? '#475569' : isCurrent ? '#e2e8f0' : '#94a3b8',
                          }}
                        >
                          {step.full}
                        </h4>
                        {isDone && (
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                            Complete
                          </span>
                        )}
                        {isCurrent && (
                          <span
                            className="text-[9px] font-semibold uppercase tracking-wider"
                            style={{ color: step.color }}
                          >
                            Current
                          </span>
                        )}
                      </div>

                      {/* Brief description for current step */}
                      {isCurrent && (
                        <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                          {step.number === 1 && 'Analyzing financial statements, earnings calls, and competitive data.'}
                          {step.number === 2 && 'Comparing metrics against selected peer companies.'}
                          {step.number === 3 && 'Vote on 6 strategic dimensions to set the M&A direction.'}
                          {step.number === 4 && 'Compare market segments and product categories generated from your strategic priorities.'}
                          {step.number === 5 && 'Compare specific acquisition targets generated from your top segments.'}
                          {step.number === 6 && 'Review force-ranked results and the consensus-driven strategic brief.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#2a3a4e] flex items-center justify-between">
          <p className="text-[10px] text-[#475569]">
            {currentIdx + 1 < STEPS.length
              ? `${STEPS.length - currentIdx - 1} step${STEPS.length - currentIdx - 1 > 1 ? 's' : ''} remaining`
              : 'Process complete'}
          </p>
          <button
            className="text-xs text-[#f97316] hover:text-[#fb923c] transition-colors font-medium"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Demo Page ─────────────────────────────────────────────────────── */
export function TrackerDemoMockup() {
  const [currentPhase, setCurrentPhase] = useState<PhaseKey>('voting_step1');
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f1419]">
      {/* Header with tracker */}
      <header className="bg-[#1a2332] border-b border-[#2a3a4e] px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-lg font-semibold text-white">CorpDev Companion</h1>
              <p className="text-xs text-[#94a3b8]">
                Hamilton Beach Brands -- 3/2/2026
              </p>
            </div>

            {/* Separator */}
            <div className="hidden md:block w-px h-8 bg-[#2a3a4e]" />

            {/* Tracker */}
            <div className="hidden md:block">
              <ProgressTracker
                currentPhase={currentPhase}
                onClick={() => setShowPopup(true)}
              />
            </div>
          </div>

          <button className="px-4 py-2 bg-[#f97316] text-white text-sm font-semibold rounded-lg hover:bg-[#ea580c] transition-colors">
            Continue
          </button>
        </div>
      </header>

      {/* Demo controls */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-2">
            Tracker Demo
          </p>
          <h2 className="text-2xl font-bold text-white mb-2">
            Progress Tracker + Process Popup
          </h2>
          <p className="text-sm text-[#94a3b8] mb-1">
            The tracker appears in the header bar on every page. Click it to open the detailed popup.
          </p>
          <p className="text-sm text-[#94a3b8]">
            Use the controls below to simulate moving through the flow.
          </p>
        </div>

        {/* Phase selector */}
        <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6 max-w-lg mx-auto">
          <p className="text-[10px] uppercase tracking-widest text-[#64748b] font-semibold mb-4">
            Simulate current step
          </p>
          <div className="flex flex-col gap-2">
            {STEPS.map((step) => (
              <button
                key={step.key}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all"
                style={{
                  backgroundColor: currentPhase === step.key ? step.color + '15' : 'transparent',
                  border: currentPhase === step.key ? `1px solid ${step.color}40` : '1px solid transparent',
                }}
                onClick={() => setCurrentPhase(step.key)}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: currentPhase === step.key ? step.color : '#0f1419',
                    border: currentPhase !== step.key ? '1.5px solid #2a3a4e' : 'none',
                  }}
                >
                  <span
                    className="text-[10px] font-mono font-bold"
                    style={{ color: currentPhase === step.key ? 'white' : '#475569' }}
                  >
                    {step.number}
                  </span>
                </div>
                <span
                  className="text-sm font-medium"
                  style={{
                    color: currentPhase === step.key ? '#e2e8f0' : '#64748b',
                  }}
                >
                  {step.full}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-[#2a3a4e] text-center">
            <button
              className="px-6 py-2 bg-[#2a3a4e] text-[#e2e8f0] text-sm rounded-lg hover:bg-[#3a4a5e] transition-colors"
              onClick={() => setShowPopup(true)}
            >
              Open Process Popup
            </button>
          </div>
        </div>
      </main>

      {/* Popup */}
      {showPopup && (
        <ProcessPopup
          currentPhase={currentPhase}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}
