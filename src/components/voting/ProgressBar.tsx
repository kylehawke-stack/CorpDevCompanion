import type { GameState } from '../../types/index.ts';

interface ProgressBarProps {
  phase: GameState['phase'];
  step1VoteCount: number;
  step2VoteCount: number;
  step3VoteCount: number;
  totalVoteCount: number;
  stepIdeaCount: number;
}

const STEP1_TARGET = 25;
const STEP2_TARGET = 50;

export function ProgressBar({ phase, step1VoteCount, step2VoteCount, step3VoteCount, totalVoteCount, stepIdeaCount }: ProgressBarProps) {
  const step3Votes = step3VoteCount || (totalVoteCount - step1VoteCount - step2VoteCount);

  const step1Pct = Math.min(100, (step1VoteCount / STEP1_TARGET) * 100);
  const step2Pct = Math.min(100, (step2VoteCount / STEP2_TARGET) * 100);
  const step3Pct = Math.min(100, step3Votes * 2); // open-ended gradual fill

  const isStep1 = phase === 'voting_step1';
  const isStep2 = phase === 'voting_step2';
  const isStep3 = phase === 'voting_step3';

  return (
    <div className="w-full space-y-2">
      {/* 3-segment bar */}
      <div className="flex gap-1">
        {/* Step 3: Strategic Priorities */}
        <div className="flex-1">
          <div className={`w-full h-2 rounded-full overflow-hidden ${isStep1 ? 'bg-indigo-500/30' : 'bg-edge'}`}>
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${step1Pct}%` }}
            />
          </div>
        </div>

        {/* Step 4: Market Segments */}
        <div className="flex-1">
          <div className={`w-full h-2 rounded-full overflow-hidden ${isStep2 ? 'bg-emerald-500/30' : 'bg-edge'}`}>
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${step2Pct}%` }}
            />
          </div>
        </div>

        {/* Step 5: Target Companies */}
        <div className="flex-1">
          <div className={`w-full h-2 rounded-full overflow-hidden ${isStep3 ? 'bg-amber-500/30' : 'bg-edge'}`}>
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${step3Pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Active step label */}
      <div className="flex items-center justify-between text-xs text-muted">
        {isStep1 && (
          <>
            <span className="font-medium text-indigo-400">Step 3: Strategic Priorities</span>
            <span>{step1VoteCount} / {STEP1_TARGET} votes on {stepIdeaCount} options</span>
          </>
        )}
        {isStep2 && (
          <>
            <span className="font-medium text-emerald-400">Step 4: Market Segments</span>
            <span>{step2VoteCount} / {STEP2_TARGET} votes on {stepIdeaCount} themes</span>
          </>
        )}
        {isStep3 && (
          <>
            <span className="font-medium text-sky-400">Step 5: Target Companies</span>
            <span>{step3Votes} votes on {stepIdeaCount} companies</span>
          </>
        )}
      </div>
    </div>
  );
}
