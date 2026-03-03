import { useGameState } from '../context/GameStateContext.tsx';
import { VotingArena } from '../components/voting/VotingArena.tsx';
import { Button } from '../components/ui/Button.tsx';
import { ProgressTracker, phaseToStep } from '../components/ProgressTracker.tsx';

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

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Top bar */}
      <header className="bg-surface-card border-b border-edge px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold text-heading">CorpDev Companion</h1>
              <p className="text-xs text-muted">{state.sessionName}</p>
            </div>
            <div className="hidden md:block">
              <ProgressTracker currentStep={phaseToStep(state.phase)} />
            </div>
          </div>
          <div className="flex items-center gap-4">
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
