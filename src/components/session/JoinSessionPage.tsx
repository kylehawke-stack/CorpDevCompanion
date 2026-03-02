import { useState } from 'react';
import { useSession } from '../../hooks/useSession.ts';
import { Button } from '../ui/Button.tsx';
import { Spinner } from '../ui/Spinner.tsx';

/**
 * Shown when a user visits ?s=CODE and hasn't joined yet.
 * Displays the session info and a "Join" button.
 */
export function JoinSessionPage() {
  const { joinCode, joinExistingSession, isJoining, joinError } = useSession();
  const [displayName, setDisplayName] = useState('');

  if (!joinCode) return null;

  const handleJoin = async () => {
    const name = displayName.trim() || 'Anonymous';
    await joinExistingSession(joinCode, name);
  };

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-surface-card rounded-xl shadow-lg border border-edge p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-heading mb-2">Join Voting Session</h1>
          <p className="text-sm text-muted mb-6">
            You've been invited to participate in a collaborative M&A prioritization session.
          </p>

          <div className="bg-surface-elevated rounded-lg border border-edge px-4 py-3 mb-6">
            <p className="text-xs text-dimmed uppercase tracking-wider mb-1">Session Code</p>
            <p className="text-2xl font-mono font-bold text-heading tracking-widest">{joinCode}</p>
          </div>

          <label className="block text-sm font-medium text-body mb-1.5 text-left">
            Your display name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Anonymous"
            autoFocus
            className="w-full px-4 py-2.5 rounded-lg border-2 border-edge focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-sm text-heading bg-surface-elevated placeholder:text-dimmed mb-4"
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
          />

          {joinError && <p className="text-negative text-sm mb-3">{joinError}</p>}

          <Button onClick={handleJoin} size="lg" className="w-full" disabled={isJoining}>
            {isJoining ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner size="sm" /> Joining...
              </span>
            ) : (
              'Join Session'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
