import { useState, useMemo } from 'react';
import { useGameState } from '../context/GameStateContext.tsx';
import { computeRankings } from '../lib/bradleyTerry.ts';
import { RankingTable } from '../components/dashboard/RankingTable.tsx';
import { SpectrumResults } from '../components/dashboard/SpectrumResults.tsx';
import { TierFilter, type FilterOption } from '../components/dashboard/TierFilter.tsx';
import { StrategicNarrative } from '../components/dashboard/StrategicNarrative.tsx';
import { Button } from '../components/ui/Button.tsx';

export function ResultsPage() {
  const { state, dispatch } = useGameState();
  const [tierFilter, setTierFilter] = useState<FilterOption>('all');

  const rankings = useMemo(
    () => computeRankings(state.ideas, state.votes),
    [state.ideas, state.votes]
  );

  const filteredRankings = useMemo(() => {
    if (tierFilter === 'all') return rankings;
    return rankings
      .filter((r) => r.idea.tier === tierFilter)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [rankings, tierFilter]);

  const handleBackToVoting = () => {
    // Return to whichever voting step they were in
    const votingPhase = state.step3Unlocked
      ? 'voting_step3'
      : state.step2Unlocked
        ? 'voting_step2'
        : 'voting_step1';
    dispatch({ type: 'SET_PHASE', phase: votingPhase });
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
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-heading">CorpDev Companion</h1>
            <p className="text-xs text-muted">
              {state.sessionName} &middot; {state.totalVoteCount} votes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleBackToVoting}>
              Continue Voting
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNewSession}>
              New Session
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Rankings */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-heading">Force-Ranked M&A Opportunities</h2>
          </div>

          <TierFilter selected={tierFilter} onChange={setTierFilter} />

          <div className="mt-4">
            {tierFilter === 'strategic_priority' ? (
              <SpectrumResults rankings={filteredRankings} />
            ) : (
              <div className="bg-surface-card rounded-xl border border-edge shadow-sm overflow-hidden">
                <RankingTable rankings={filteredRankings} />
              </div>
            )}
          </div>

          <p className="text-xs text-dimmed mt-2">
            Scores use Bradley-Terry MLE displayed as Elo-equivalent ratings (median = 1500). 95% confidence intervals via Fisher information.
          </p>
        </section>

        {/* Strategic Narrative */}
        <section>
          <h2 className="text-2xl font-bold text-heading mb-4">Strategic Analysis</h2>
          <StrategicNarrative
            rankings={rankings}
            totalVotes={state.totalVoteCount}
            sessionName={state.sessionName}
            strategicContext={state.strategicContext}
          />
        </section>
      </main>
    </div>
  );
}
