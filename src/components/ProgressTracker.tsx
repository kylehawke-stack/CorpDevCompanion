import { useState } from 'react';
import { ProcessPopup } from './ProcessPopup.tsx';

const STEPS = [
  { num: 1, label: 'Analyze' },
  { num: 2, label: 'Benchmark' },
  { num: 3, label: 'Strategy' },
  { num: 4, label: 'Markets' },
  { num: 5, label: 'Targets' },
  { num: 6, label: 'Brief' },
];

/**
 * Maps GameState phase names to step numbers (1-6).
 */
export function phaseToStep(phase: string): number {
  switch (phase) {
    case 'welcome':
    case 'analyzing':
    case 'how_it_works':
      return 1;
    case 'peer_selection':
    case 'peer_benchmarking':
      return 2;
    case 'briefing':
      return 2; // briefing is output of step 2, user is about to start step 3
    case 'voting_step1':
      return 3;
    case 'transition1':
    case 'voting_step2':
      return 4;
    case 'transition2':
    case 'voting_step3':
      return 5;
    case 'results':
      return 6;
    default:
      return 1;
  }
}

interface ProgressTrackerProps {
  /** Current step 1-6 */
  currentStep: number;
}

export function ProgressTracker({ currentStep }: ProgressTrackerProps) {
  const [popupOpen, setPopupOpen] = useState(false);

  function stepColor(stepNum: number): string {
    if (stepNum < currentStep) return '#22c55e'; // completed
    if (stepNum === currentStep) return '#f97316'; // current
    return '#2a3a4e'; // upcoming
  }

  function lineColor(fromStep: number): string {
    if (fromStep < currentStep) return '#22c55e';
    return '#2a3a4e';
  }

  return (
    <>
      <button
        onClick={() => setPopupOpen(true)}
        className="flex items-center gap-0.5 group"
        title="View full process"
      >
        {STEPS.map((step, i) => (
          <div key={step.num} className="flex items-center">
            {/* Pip */}
            <div className="flex flex-col items-center">
              <div
                className="flex items-center justify-center rounded-full transition-all"
                style={{
                  width: step.num === currentStep ? 26 : 20,
                  height: step.num === currentStep ? 26 : 20,
                  backgroundColor: stepColor(step.num),
                }}
              >
                {step.num < currentStep ? (
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
                      color:
                        step.num === currentStep
                          ? 'white'
                          : '#475569',
                    }}
                  >
                    {step.num}
                  </span>
                )}
              </div>
              {/* Label -- only show for current step */}
              {step.num === currentStep && (
                <p className="text-[9px] font-semibold text-[#f97316] mt-0.5 whitespace-nowrap">
                  {step.label}
                </p>
              )}
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className="h-0.5 transition-colors"
                style={{
                  width: 12,
                  backgroundColor: lineColor(step.num),
                }}
              />
            )}
          </div>
        ))}

        {/* Info icon */}
        <div className="ml-1.5 w-4 h-4 rounded-full border border-[#2a3a4e] flex items-center justify-center opacity-50 group-hover:opacity-100 group-hover:border-[#f97316] transition-all">
          <span className="text-[9px] text-[#64748b] group-hover:text-[#f97316]">i</span>
        </div>
      </button>

      {/* Process popup */}
      {popupOpen && (
        <ProcessPopup
          currentStep={currentStep}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </>
  );
}
