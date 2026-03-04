import { useState } from 'react';
import { useSession } from '../../hooks/useSession.ts';
import { Button } from '../ui/Button.tsx';

interface CreateSessionModalProps {
  onClose: () => void;
}

/**
 * Modal for converting the current solo session into a collaborative one.
 * Uploads state to Supabase and shows the shareable link.
 */
export function CreateSessionModal({ onClose }: CreateSessionModalProps) {
  const { createNewSession, shareUrl } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    const name = displayName.trim() || 'Anonymous';
    setIsCreating(true);
    setError(null);
    try {
      await createNewSession(name);
      setCreated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-card rounded-xl shadow-2xl border border-edge p-6 max-w-md w-full mx-4">
        {!created ? (
          <>
            <h3 className="text-lg font-semibold text-heading mb-1">Link / Add Others</h3>
            <p className="text-sm text-muted mb-4">
              Create a collaborative session so others can vote alongside you.
              You'll get a shareable link to invite participants.
            </p>

            <label className="block text-sm font-medium text-body mb-1.5">
              Your display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Anonymous"
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border-2 border-edge focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-sm text-heading bg-surface-elevated placeholder:text-dimmed"
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            />

            {error && <p className="text-negative text-sm mt-2">{error}</p>}

            <div className="flex justify-end gap-3 mt-5">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Session'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-heading mb-1">Session Live!</h3>
            <p className="text-sm text-muted mb-4">
              Share this link with your team to invite them to vote.
            </p>

            <div className="flex items-center gap-2 bg-surface-elevated rounded-lg border border-edge p-3">
              <input
                type="text"
                readOnly
                value={shareUrl ?? ''}
                className="flex-1 bg-transparent text-sm text-heading font-mono outline-none"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors shrink-0"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="flex justify-end mt-5">
              <Button size="sm" onClick={onClose}>Done</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
