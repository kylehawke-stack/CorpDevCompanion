import { useGameState } from '../context/GameStateContext.tsx';
import { VotingArena } from '../components/voting/VotingArena.tsx';
import { Button } from '../components/ui/Button.tsx';

export function VotePage() {
  const { state, dispatch } = useGameState();

  const handleViewResults = () => {
    dispatch({ type: 'SET_PHASE', phase: 'results' });
  };

  const handleNewSession = () => {
    if (window.confirm('Start a new session? Current progress will be lost.')) {
      dispatch({ type: 'RESET_SESSION' });
    }
  };

  const stepLabel = state.phase === 'voting_step1'
    ? 'Step 3: Strategic Priorities'
    : state.phase === 'voting_step2'
      ? 'Step 4: Market Segments'
      : 'Step 5: Target Companies';

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Top bar */}
      <header className="bg-surface-card border-b border-edge px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-heading">CorpDev Companion</h1>
            <p className="text-xs text-muted">{state.sessionName} &middot; {stepLabel}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-sm font-medium text-body">
                {state.ideas.length} opportunities
              </span>
              <span className="text-dimmed mx-2">|</span>
              <span className="text-sm text-muted">
                {state.totalVoteCount} votes
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleNewSession}>
              New Session
            </Button>
          </div>
        </div>
      </header>

      {/* Voting area */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <VotingArena onViewResults={handleViewResults} />
      </main>
    </div>
  );
}
