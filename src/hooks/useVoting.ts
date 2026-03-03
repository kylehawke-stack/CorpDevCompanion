import { useState, useCallback, useEffect, useRef } from 'react';
import type { Idea, Vote } from '../types/index.ts';
import { useGameState } from '../context/GameStateContext.tsx';
import { selectPair } from '../lib/pairingEngine.ts';
import { syncVote } from '../lib/supabaseSync.ts';

export function useVoting() {
  const { state, dispatch } = useGameState();
  const [currentPair, setCurrentPair] = useState<[Idea, Idea] | null>(null);
  // Sliding window of recently shown item IDs (last 3 pairs = 6 IDs)
  // Used to penalize repeat items and prevent one item from dominating pairings
  const recentItems = useRef<string[]>([]);

  const pickNextPair = useCallback(() => {
    const pair = selectPair(state.ideas, state.votes, state.totalVoteCount, state.phase, recentItems.current);
    if (pair) {
      recentItems.current = [...recentItems.current, pair[0].id, pair[1].id].slice(-6);
    }
    setCurrentPair(pair);
  }, [state.ideas, state.votes, state.totalVoteCount, state.phase]);

  // Pick first pair when ideas are loaded
  useEffect(() => {
    if (state.ideas.length >= 2 && !currentPair) {
      pickNextPair();
    }
  }, [state.ideas.length, currentPair, pickNextPair]);

  const submitVote = useCallback(
    (winnerId: string, loserId: string) => {
      const vote: Vote = {
        id: crypto.randomUUID(),
        voterId: state.voterId,
        winnerId,
        loserId,
        skipped: false,
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_VOTE', vote });
      // Fire-and-forget sync to Supabase in collaborative mode
      if (state.sessionId) {
        syncVote(vote, state.sessionId, state.phase);
      }
      // Pick next pair after a brief pause for animation
      setTimeout(pickNextPair, 100);
    },
    [state.voterId, state.sessionId, state.phase, dispatch, pickNextPair]
  );

  const skipPair = useCallback(() => {
    if (!currentPair) return;
    const vote: Vote = {
      id: crypto.randomUUID(),
      voterId: state.voterId,
      winnerId: currentPair[0].id,
      loserId: currentPair[1].id,
      skipped: true,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_VOTE', vote });
    // Fire-and-forget sync to Supabase in collaborative mode
    if (state.sessionId) {
      syncVote(vote, state.sessionId, state.phase);
    }
    setTimeout(pickNextPair, 100);
  }, [currentPair, state.voterId, state.sessionId, state.phase, dispatch, pickNextPair]);

  return {
    currentPair,
    submitVote,
    skipPair,
    totalVotes: state.totalVoteCount,
    pickNextPair,
  };
}
