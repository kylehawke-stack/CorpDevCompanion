import { useEffect } from 'react';

const ZONES = [
  {
    label: 'FOUNDATION',
    color: '#64748b',
    steps: [
      {
        num: 1,
        title: 'Company Analysis',
        description: 'Analyzing financial statements, earnings calls, and competitive data.',
      },
      {
        num: 2,
        title: 'Peer Benchmarking',
        description: 'Comparing metrics against selected peer companies.',
      },
    ],
  },
  {
    label: 'TEAM ALIGNMENT',
    color: '#f97316',
    steps: [
      {
        num: 3,
        title: 'Strategic Priorities',
        description: 'Vote on 6 strategic dimensions to set the M&A direction.',
      },
      {
        num: 4,
        title: 'Market Segments',
        description:
          'Compare market segments and product categories generated from your strategic priorities.',
      },
      {
        num: 5,
        title: 'Target Companies',
        description: 'Compare specific acquisition targets generated from your top segments.',
      },
    ],
  },
  {
    label: 'DELIVERABLE',
    color: '#22c55e',
    steps: [
      {
        num: 6,
        title: 'Strategic Brief',
        description:
          'Review force-ranked results and the consensus-driven strategic brief.',
      },
    ],
  },
];

interface ProcessPopupProps {
  currentStep: number;
  onClose: () => void;
}

export function ProcessPopup({ currentStep, onClose }: ProcessPopupProps) {
  const remaining = Math.max(0, 6 - currentStep);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function stepStatus(num: number): 'done' | 'current' | 'upcoming' {
    if (num < currentStep) return 'done';
    if (num === currentStep) return 'current';
    return 'upcoming';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-[#1a2332] border border-[#2a3a4e] rounded-xl w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-[#1a2332] border-b border-[#2a3a4e] px-5 py-4 flex items-center justify-between z-10">
          <div>
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316]">
              Process Overview
            </p>
            <p className="text-xs text-[#64748b] mt-0.5">
              Step {currentStep} of 6
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-[#2a3a4e] flex items-center justify-center text-[#64748b] hover:text-[#e2e8f0] hover:border-[#3a4459] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body -- zones */}
        <div className="px-5 py-4 flex flex-col gap-5">
          {ZONES.map((zone) => (
            <div key={zone.label}>
              {/* Zone label */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: zone.color }}
                />
                <p
                  className="uppercase tracking-widest text-[9px] font-semibold"
                  style={{ color: zone.color }}
                >
                  {zone.label}
                </p>
                <div className="flex-1 h-px" style={{ backgroundColor: `${zone.color}25` }} />
              </div>

              {/* Steps */}
              <div className="flex flex-col gap-2">
                {zone.steps.map((step) => {
                  const status = stepStatus(step.num);
                  return (
                    <div
                      key={step.num}
                      className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                        status === 'current'
                          ? 'bg-[#f97316]/10 border border-[#f97316]/30'
                          : status === 'done'
                          ? 'bg-[#0f1419]/50'
                          : 'opacity-50'
                      }`}
                    >
                      {/* Step circle */}
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          backgroundColor:
                            status === 'done'
                              ? '#22c55e'
                              : status === 'current'
                              ? '#f97316'
                              : '#2a3a4e',
                        }}
                      >
                        {status === 'done' ? (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <span
                            className="text-[10px] font-bold"
                            style={{
                              color: status === 'current' ? 'white' : '#475569',
                            }}
                          >
                            {step.num}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-xs font-semibold ${
                              status === 'done'
                                ? 'text-[#94a3b8]'
                                : status === 'current'
                                ? 'text-[#e2e8f0]'
                                : 'text-[#475569]'
                            }`}
                          >
                            {step.title}
                          </p>
                          {status === 'done' && (
                            <span className="text-[9px] font-semibold text-[#22c55e] uppercase tracking-wider">
                              Complete
                            </span>
                          )}
                          {status === 'current' && (
                            <span className="text-[9px] font-semibold text-[#f97316] uppercase tracking-wider">
                              Current
                            </span>
                          )}
                        </div>
                        {status === 'current' && (
                          <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-relaxed">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1a2332] border-t border-[#2a3a4e] px-5 py-3 flex items-center justify-between">
          <p className="text-xs text-[#64748b]">
            {remaining > 0 ? `${remaining} step${remaining === 1 ? '' : 's'} remaining` : 'Process complete'}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-[#94a3b8] border border-[#2a3a4e] rounded-lg hover:border-[#3a4459] hover:text-[#e2e8f0] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
