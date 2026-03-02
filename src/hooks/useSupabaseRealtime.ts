import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.ts';
import { rowToIdea, rowToVote } from '../lib/supabaseSync.ts';
import type { GameAction } from '../types/index.ts';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscribes to Supabase Realtime channels for a collaborative session.
 * Dispatches REMOTE_VOTE, REMOTE_IDEAS, and REMOTE_SESSION_UPDATE actions
 * when changes from other clients arrive.
 *
 * Only active when sessionId is present and supabase client exists.
 */
export function useSupabaseRealtime(
  sessionId: string | undefined,
  voterId: string,
  dispatch: React.Dispatch<GameAction>
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!supabase || !sessionId) return;

    const channel = supabase
      .channel(`session:${sessionId}`)
      // ── Votes: INSERT only ────────────────────────────────────
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new;
          // Skip our own votes (already applied optimistically)
          if (row.voter_id === voterId) return;

          const vote = rowToVote(row);

          // We don't have authoritative counters from the INSERT event,
          // so we'll fetch the session row for the latest counts.
          supabase!
            .from('sessions')
            .select('total_vote_count, step1_vote_count, step2_vote_count, step3_vote_count')
            .eq('id', sessionId)
            .single()
            .then(({ data }) => {
              if (data) {
                dispatch({
                  type: 'REMOTE_VOTE',
                  vote,
                  counters: {
                    totalVoteCount: data.total_vote_count,
                    step1VoteCount: data.step1_vote_count,
                    step2VoteCount: data.step2_vote_count,
                    step3VoteCount: data.step3_vote_count,
                  },
                });
              }
            });
        }
      )
      // ── Ideas: INSERT only ────────────────────────────────────
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ideas',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const idea = rowToIdea(payload.new);
          dispatch({ type: 'REMOTE_IDEAS', ideas: [idea] });
        }
      )
      // ── Session: UPDATE (phase changes, step unlocks, etc.) ───
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new;
          dispatch({
            type: 'REMOTE_SESSION_UPDATE',
            changes: {
              phase: row.phase,
              step2Unlocked: row.step2_unlocked,
              step3Unlocked: row.step3_unlocked,
              totalVoteCount: row.total_vote_count,
              step1VoteCount: row.step1_vote_count,
              step2VoteCount: row.step2_vote_count,
              step3VoteCount: row.step3_vote_count,
              lastInjectionAtVoteCount: row.last_injection_at_vote_count,
              userDirections: row.user_directions,
            },
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [sessionId, voterId, dispatch]);
}
