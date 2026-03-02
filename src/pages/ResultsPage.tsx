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
    <div className="min-h-screen bg-[#0f1419]">
      {/* Top bar */}
      <header className="bg-[#1a2332] border-b border-[#2a3a4e] px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">CorpDev Companion</h1>
            <p className="text-xs text-[#94a3b8]">
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
          <div className="mb-4">
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">
              {tierFilter === 'strategic_priority' ? 'Strategic Priorities' : 'Rankings'}
            </p>
            <h2 className="text-2xl font-bold text-white mb-1">
              Force-Ranked M&A {tierFilter === 'strategic_priority' ? 'Dimensions' : 'Opportunities'}
            </h2>
            {tierFilter === 'strategic_priority' && (
              <p className="text-sm text-[#94a3b8]">
                6 strategic dimensions ranked by team consensus. The bar shows the spectrum of options with the orange marker at the team's weighted position.
              </p>
            )}
          </div>

          <TierFilter selected={tierFilter} onChange={setTierFilter} />

          <div className="mt-4">
            {tierFilter === 'strategic_priority' ? (
              <SpectrumResults rankings={filteredRankings} />
            ) : (
              <div className="bg-[#1a2332] rounded-xl border border-[#2a3a4e] overflow-hidden">
                <RankingTable rankings={filteredRankings} />
              </div>
            )}
          </div>

          <p className="text-[11px] text-[#64748b] mt-4">
            Scores use Bradley-Terry MLE displayed as Elo-equivalent ratings (median = 1500). 95% confidence intervals via Fisher information.
          </p>
        </section>

        {/* Strategic Narrative */}
        <section>
          <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-1">
            Analysis
          </p>
          <h2 className="text-2xl font-bold text-white mb-4">Strategic Narrative</h2>
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
