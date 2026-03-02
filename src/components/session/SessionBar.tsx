import { useState } from 'react';
import { useSession } from '../../hooks/useSession.ts';
import { useGameState } from '../../context/GameStateContext.tsx';
import { syncPhaseChange } from '../../lib/supabaseSync.ts';
import type { GameState } from '../../types/index.ts';

/**
 * Thin top bar displayed during collaborative sessions.
 * Shows share code, participant count, admin badge, and phase advancement button.
 */
export function SessionBar() {
  const { isAdmin, participantCount, shareUrl, shareCode } = useSession();
  const { state, dispatch } = useGameState();
  const [copied, setCopied] = useState(false);

  if (!state.isCollaborative) return null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdvancePhase = async () => {
    if (!isAdmin || !state.sessionId) return;

    let nextPhase: string | null = null;
    const extras: Record<string, unknown> = {};

    if (state.phase === 'voting_step1' && state.step2Unlocked) {
      nextPhase = 'transition1';
    } else if (state.phase === 'voting_step2' && state.step3Unlocked) {
      nextPhase = 'transition2';
    } else if (state.phase === 'voting_step3') {
      nextPhase = 'results';
    }

    if (nextPhase) {
      dispatch({ type: 'SET_PHASE', phase: nextPhase as GameState['phase'] });
      await syncPhaseChange(state.sessionId, nextPhase, extras);
    }
  };

  const canAdvance = isAdmin && (
    (state.phase === 'voting_step1' && state.step2Unlocked) ||
    (state.phase === 'voting_step2' && state.step3Unlocked) ||
    state.phase === 'voting_step3'
  );

  return (
    <div className="bg-surface-elevated border-b border-edge px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-3">
        {/* Share code */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-card border border-edge hover:border-accent/50 transition-colors"
          title="Click to copy invite link"
        >
          <span className="font-mono font-semibold text-heading tracking-wider">{shareCode}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {copied && <span className="text-positive text-xs">Copied!</span>}
        </button>

        {/* Participant count */}
        <span className="text-muted flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {participantCount}
        </span>

        {/* Admin badge */}
        {isAdmin && (
          <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
            Admin
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {canAdvance && (
          <button
            onClick={handleAdvancePhase}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            Advance Phase
          </button>
        )}
      </div>
    </div>
  );
}
