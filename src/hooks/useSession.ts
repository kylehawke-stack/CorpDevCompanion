import { useState, useEffect, useCallback } from 'react';
import { useGameState } from '../context/GameStateContext.tsx';
import { supabase } from '../lib/supabase.ts';
import { getOrCreateVoterId } from '../lib/voterId.ts';
import { createSession, joinSession, loadSession, getParticipantCount } from '../lib/supabaseSync.ts';

/**
 * Session lifecycle hook.
 * Handles creating/joining sessions, detecting ?s=CODE, and tracking participants.
 */
export function useSession() {
  const { state, dispatch } = useGameState();
  const [participantCount, setParticipantCount] = useState(1);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const voterId = getOrCreateVoterId();
  const isAdmin = state.isCollaborative && state.adminVoterId === voterId;
  const isCollaborative = !!state.isCollaborative;

  // Detect ?s=CODE on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('s');
    if (code && !state.isCollaborative) {
      setJoinCode(code.toUpperCase());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reconnect to existing session on reload
  useEffect(() => {
    if (state.sessionId && state.isCollaborative && supabase) {
      // Reload session from Supabase to get latest state
      loadSession(state.sessionId, voterId).then((freshState) => {
        if (freshState) {
          dispatch({ type: 'LOAD_SESSION', state: freshState });
        }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll participant count
  useEffect(() => {
    if (!state.sessionId) return;

    const refresh = () => {
      getParticipantCount(state.sessionId!).then(setParticipantCount);
    };
    refresh();
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [state.sessionId]);

  const createNewSession = useCallback(
    async (displayName: string) => {
      const result = await createSession(state, voterId, displayName);
      dispatch({
        type: 'SET_SESSION_INFO',
        sessionId: result.sessionId,
        shareCode: result.shareCode,
        adminVoterId: voterId,
        isCollaborative: true,
      });
      return result;
    },
    [state, voterId, dispatch]
  );

  const joinExistingSession = useCallback(
    async (code: string, displayName: string) => {
      setIsJoining(true);
      setJoinError(null);
      try {
        const sessionState = await joinSession(code, voterId, displayName);
        if (!sessionState) {
          setJoinError('Session not found. Check the code and try again.');
          return false;
        }
        dispatch({ type: 'LOAD_SESSION', state: sessionState });
        // Clean up the URL
        window.history.replaceState({}, '', window.location.pathname);
        setJoinCode(null);
        return true;
      } catch (err) {
        setJoinError(err instanceof Error ? err.message : 'Failed to join session');
        return false;
      } finally {
        setIsJoining(false);
      }
    },
    [voterId, dispatch]
  );

  const shareUrl = state.shareCode
    ? `${window.location.origin}${window.location.pathname}?s=${state.shareCode}`
    : null;

  return {
    isAdmin,
    isCollaborative,
    participantCount,
    shareUrl,
    shareCode: state.shareCode ?? null,
    joinCode,
    setJoinCode,
    isJoining,
    joinError,
    createNewSession,
    joinExistingSession,
    voterId,
  };
}
