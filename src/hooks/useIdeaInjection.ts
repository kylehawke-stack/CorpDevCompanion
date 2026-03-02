import { useEffect, useRef, useState } from 'react';
import { useGameState } from '../context/GameStateContext.tsx';
import { computeRankings } from '../lib/bradleyTerry.ts';
import { injectIdeas } from '../lib/api.ts';

const INJECTION_INTERVAL = 5; // Every 5 votes
const MAX_IDEAS = 80;

export function useIdeaInjection() {
  const { state, dispatch } = useGameState();
  const [isInjecting, setIsInjecting] = useState(false);
  const [newIdeaCount, setNewIdeaCount] = useState(0);
  const injectionInFlight = useRef(false);

  useEffect(() => {
    // Only inject during active voting phases (skip Step 1 — fixed dimension set, no injection)
    if (state.phase !== 'voting_step2' && state.phase !== 'voting_step3') return;

    const votesSinceInjection = state.totalVoteCount - state.lastInjectionAtVoteCount;

    if (
      votesSinceInjection >= INJECTION_INTERVAL &&
      state.ideas.length < MAX_IDEAS &&
      !injectionInFlight.current &&
      state.totalVoteCount >= INJECTION_INTERVAL
    ) {
      injectionInFlight.current = true;
      setIsInjecting(true);

      const rankings = computeRankings(state.ideas, state.votes);

      // Derive voting step from phase (Step 1 is skipped above)
      const votingStep = state.phase === 'voting_step2'
        ? 'step2' as const
        : 'step3' as const;

      // Compute top strategic priorities from strategic_priority ideas
      const strategicPriorityRankings = rankings
        .filter((r) => r.idea.tier === 'strategic_priority')
        .slice(0, 5);
      const topStrategicPriorities = strategicPriorityRankings.map((r) => ({
        title: r.idea.title,
        score: r.displayScore,
        rank: r.rank,
      }));

      injectIdeas(
        rankings,
        state.totalVoteCount,
        state.ideas,
        votingStep,
        state.strategicContext,
        state.companyProfile,
        topStrategicPriorities,
        state.lastInjectionAtVoteCount,
        state.userDirections,
        state.competitorProfiles,
        state.promptData,
        state.competitorPromptData
      )
        .then((newIdeas) => {
          if (newIdeas.length > 0) {
            dispatch({ type: 'ADD_IDEAS', ideas: newIdeas });
            setNewIdeaCount(newIdeas.length);
            setTimeout(() => setNewIdeaCount(0), 3000);
          }
          dispatch({ type: 'SET_INJECTION_COUNT', count: state.totalVoteCount });
        })
        .catch((err) => {
          console.error('Idea injection failed:', err);
        })
        .finally(() => {
          setIsInjecting(false);
          injectionInFlight.current = false;
        });
    }
  }, [state.totalVoteCount, state.lastInjectionAtVoteCount, state.ideas, state.votes, state.phase, state.strategicContext, state.companyProfile, state.userDirections, dispatch]);

  return { isInjecting, newIdeaCount };
}
