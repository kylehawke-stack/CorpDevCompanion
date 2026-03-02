import { useEffect, useState, useMemo } from 'react';
import { useGameState } from '../context/GameStateContext.tsx';
import { computeRankings } from '../lib/bradleyTerry.ts';
import { generateSeedIdeas, generateCompanyIdeas } from '../lib/api.ts';
import { syncIdeas, syncPhaseChange } from '../lib/supabaseSync.ts';
import { getOrCreateVoterId } from '../lib/voterId.ts';
import { Spinner } from '../components/ui/Spinner.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { SpectrumResults } from '../components/dashboard/SpectrumResults.tsx';

export function TransitionPage() {
  const { state, dispatch } = useGameState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTransition1 = state.phase === 'transition1';
  const isCollaborative = !!state.isCollaborative;
  const isAdmin = !isCollaborative || state.adminVoterId === getOrCreateVoterId();

  // Filter ideas relevant to this transition
  const filteredIdeas = useMemo(() => {
    if (isTransition1) {
      return state.ideas.filter((i) => i.tier === 'strategic_priority');
    }
    return state.ideas.filter((i) => i.tier === 'market_segment' || i.tier === 'product_category');
  }, [state.ideas, isTransition1]);

  const rankings = useMemo(
    () => computeRankings(filteredIdeas, state.votes),
    [filteredIdeas, state.votes]
  );

  // Always compute strategic priorities for context
  const topStrategicPriorities = useMemo(() => {
    const spIdeas = state.ideas.filter((i) => i.tier === 'strategic_priority');
    const spRankings = computeRankings(spIdeas, state.votes);
    return spRankings.slice(0, 5).map((r) => ({
      title: r.idea.title,
      score: r.displayScore,
      rank: r.rank,
    }));
  }, [state.ideas, state.votes]);

  const topResults = rankings.slice(0, 8);

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // In collaborative mode, only the admin generates ideas.
    // Non-admins wait for ideas to arrive via Realtime.
    if (isCollaborative && !isAdmin) {
      setLoading(true);
      return;
    }

    const abortController = new AbortController();
    setLoading(true);
    setError(null);

    async function fetchIdeas() {
      try {
        if (isTransition1) {
          const segmentIdeas = await generateSeedIdeas(
            state.companyProfile!,
            topStrategicPriorities,
            state.strategicContext,
            state.competitorProfiles,
            state.promptData,
            state.competitorPromptData
          );
          if (abortController.signal.aborted) return;
          dispatch({ type: 'START_STEP2', segmentIdeas });
          // Sync ideas and phase to Supabase
          if (state.sessionId) {
            await syncIdeas(segmentIdeas, state.sessionId);
            await syncPhaseChange(state.sessionId, 'voting_step2');
          }
        } else {
          const companyIdeas = await generateCompanyIdeas(
            rankings,
            state.strategicContext,
            topStrategicPriorities,
            state.competitorProfiles,
            state.promptData,
            state.competitorPromptData,
            abortController.signal
          );
          if (abortController.signal.aborted) return;
          dispatch({ type: 'START_STEP3', companyIdeas });
          // Sync ideas and phase to Supabase
          if (state.sessionId) {
            await syncIdeas(companyIdeas, state.sessionId);
            await syncPhaseChange(state.sessionId, 'voting_step3');
          }
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to generate ideas');
        setLoading(false);
      }
    }

    fetchIdeas();
    return () => { abortController.abort(); };
  }, [retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const stepLabel = isTransition1 ? 'Step 1 Complete' : 'Step 2 Complete';
  const description = isTransition1
    ? `${state.step1VoteCount} votes cast across strategic priorities`
    : `${state.step2VoteCount} votes cast across market segments and product categories`;
  const summaryTitle = isTransition1 ? 'Top Strategic Priorities' : 'Top Strategic Themes';

  const loadingMessage = isCollaborative && !isAdmin
    ? 'Waiting for the session admin to generate the next set of ideas...'
    : isTransition1
      ? 'Generating market segments and product categories based on your top priorities...'
      : 'Generating company acquisition targets based on your top themes...';

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center">
      <div className="max-w-2xl w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-heading">{stepLabel}</h1>
          <p className="text-body mt-2">{description}</p>
        </div>

        {/* Top results summary */}
        {isTransition1 ? (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-heading mb-4">{summaryTitle}</h2>
            <SpectrumResults rankings={rankings} />
          </div>
        ) : (
          <div className="bg-surface-card rounded-xl shadow-lg border border-edge p-6 mb-6">
            <h2 className="text-lg font-semibold text-heading mb-4">{summaryTitle}</h2>
            <div className="space-y-3">
              {topResults.map((r, i) => (
                <div key={r.idea.id} className="flex items-center gap-3">
                  <span className={`text-sm font-bold w-6 ${i < 3 ? 'text-accent' : 'text-dimmed'}`}>
                    {r.rank}
                  </span>
                  <Badge tier={r.idea.tier} dimensionLabel={r.idea.dimension} linkedTheme={r.idea.linkedTheme} />
                  <span className="text-sm text-heading font-medium">{r.idea.title}</span>
                  <span className="text-xs text-dimmed ml-auto font-mono">{r.displayScore}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading / error state */}
        <div className="bg-surface-card rounded-xl shadow-lg border border-edge p-6 text-center">
          {loading && !error ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Spinner size="lg" />
              <p className="text-sm text-body">{loadingMessage}</p>
              <p className="text-xs text-dimmed">
                {isCollaborative && !isAdmin ? 'You\'ll be moved to the next step automatically' : 'This may take up to 2 minutes'}
              </p>
            </div>
          ) : error ? (
            <div className="py-4">
              <p className="text-negative text-sm mb-3">{error}</p>
              <button
                onClick={() => setRetryCount((c) => c + 1)}
                className="text-sm text-accent underline hover:text-accent-hover"
              >
                Try again
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
