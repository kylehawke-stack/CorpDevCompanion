import { useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IdeaCard } from './IdeaCard.tsx';
import { ProgressBar } from './ProgressBar.tsx';
import { Button } from '../ui/Button.tsx';
import { useVoting } from '../../hooks/useVoting.ts';
import { useIdeaInjection } from '../../hooks/useIdeaInjection.ts';
import { useGameState } from '../../context/GameStateContext.tsx';
import { syncPhaseChange, updateSessionField } from '../../lib/supabaseSync.ts';
import { getOrCreateVoterId } from '../../lib/voterId.ts';

interface VotingArenaProps {
  onViewResults: () => void;
}

const STEP1_TARGET = 25;
const STEP2_TARGET = 50;

export function VotingArena({ onViewResults }: VotingArenaProps) {
  const { currentPair, submitVote, skipPair } = useVoting();
  const { newIdeaCount } = useIdeaInjection();
  const { state, dispatch } = useGameState();
  const [showDirectionModal, setShowDirectionModal] = useState(false);
  const [directionText, setDirectionText] = useState('');

  const isCollaborative = !!state.isCollaborative;
  const isAdmin = !isCollaborative || state.adminVoterId === getOrCreateVoterId();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (showDirectionModal) return; // Don't capture keys when modal is open
      if (!currentPair) return;
      if (e.key === 'a' || e.key === 'A') {
        submitVote(currentPair[0].id, currentPair[1].id);
      } else if (e.key === 'l' || e.key === 'L') {
        submitVote(currentPair[1].id, currentPair[0].id);
      } else if (e.key === ' ') {
        e.preventDefault();
        skipPair();
      }
    },
    [currentPair, submitVote, skipPair, showDirectionModal]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-unlock step 2 when threshold reached
  useEffect(() => {
    if (
      state.phase === 'voting_step1' &&
      state.step1VoteCount >= STEP1_TARGET &&
      !state.step2Unlocked
    ) {
      dispatch({ type: 'UNLOCK_STEP2' });
      if (state.sessionId) {
        updateSessionField(state.sessionId, { step2_unlocked: true });
      }
    }
  }, [state.phase, state.step1VoteCount, state.step2Unlocked, state.sessionId, dispatch]);

  // Auto-unlock step 3 when threshold reached
  useEffect(() => {
    if (
      state.phase === 'voting_step2' &&
      state.step2VoteCount >= STEP2_TARGET &&
      !state.step3Unlocked
    ) {
      dispatch({ type: 'UNLOCK_STEP3' });
      if (state.sessionId) {
        updateSessionField(state.sessionId, { step3_unlocked: true });
      }
    }
  }, [state.phase, state.step2VoteCount, state.step3Unlocked, state.sessionId, dispatch]);

  const handleProceedToStep2 = () => {
    dispatch({ type: 'SET_PHASE', phase: 'transition1' });
    if (state.sessionId) {
      syncPhaseChange(state.sessionId, 'transition1');
    }
  };

  const handleProceedToStep3 = () => {
    dispatch({ type: 'SET_PHASE', phase: 'transition2' });
    if (state.sessionId) {
      syncPhaseChange(state.sessionId, 'transition2');
    }
  };

  const handleSubmitDirection = () => {
    const trimmed = directionText.trim();
    if (trimmed) {
      dispatch({ type: 'ADD_DIRECTION', direction: trimmed });
      setDirectionText('');
      setShowDirectionModal(false);
    }
  };

  if (!currentPair) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Loading next pair...</p>
      </div>
    );
  }

  // Item 12: Step-specific question titles
  const questionTitle = state.phase === 'voting_step1'
    ? 'What is more important to our M&A strategy?'
    : state.phase === 'voting_step2'
      ? 'Which market segment is more attractive?'
      : 'Which company represents a better fit?';

  // Item 17: Step-specific idea counts
  const stepIdeaCount = state.ideas.filter((i) => {
    if (state.phase === 'voting_step1') return i.tier === 'strategic_priority';
    if (state.phase === 'voting_step2') return i.tier === 'market_segment' || i.tier === 'product_category';
    return i.tier === 'specific_company';
  }).length;

  const stepVoteCount = state.phase === 'voting_step1'
    ? state.step1VoteCount
    : state.phase === 'voting_step2'
      ? state.step2VoteCount
      : state.step3VoteCount;

  // Item 11: View Results button should be prominent after 50 Step 3 votes
  const step3ViewResultsProminent = state.phase === 'voting_step3' && state.step3VoteCount >= 50;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <ProgressBar
        phase={state.phase}
        step1VoteCount={state.step1VoteCount}
        step2VoteCount={state.step2VoteCount}
        step3VoteCount={state.step3VoteCount}
        totalVoteCount={state.totalVoteCount}
        stepIdeaCount={stepIdeaCount}
      />

      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-heading">
          {questionTitle}
        </h2>
        <p className="text-sm text-muted mt-1">
          Click a card or use keyboard shortcuts
        </p>
      </div>

      {/* Cards */}
      <div className="flex gap-6 items-stretch">
        <AnimatePresence mode="wait">
          <IdeaCard
            key={currentPair[0].id}
            idea={currentPair[0]}
            onSelect={() => submitVote(currentPair[0].id, currentPair[1].id)}
            side="left"
          />
        </AnimatePresence>

        <div className="flex items-center">
          <span className="text-2xl font-bold text-dimmed">vs</span>
        </div>

        <AnimatePresence mode="wait">
          <IdeaCard
            key={currentPair[1].id}
            idea={currentPair[1]}
            onSelect={() => submitVote(currentPair[1].id, currentPair[0].id)}
            side="right"
          />
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {state.phase === 'voting_step2' && (
            <Button variant="ghost" onClick={() => dispatch({ type: 'SET_PHASE', phase: 'voting_step1' })}>
              &larr; Back to Step 1
            </Button>
          )}
          {state.phase === 'voting_step3' && (
            <Button variant="ghost" onClick={() => dispatch({ type: 'SET_PHASE', phase: 'voting_step2' })}>
              &larr; Back to Step 2
            </Button>
          )}
          <Button variant="ghost" onClick={skipPair}>
            Skip (Space)
          </Button>
          <button
            onClick={() => setShowDirectionModal(true)}
            className="text-xs text-muted hover:text-accent border border-edge hover:border-accent/50 rounded-lg px-3 py-1.5 transition-colors"
          >
            Suggest direction{state.userDirections.length > 0 && ` (${state.userDirections.length})`}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* New ideas notification */}
          <AnimatePresence>
            {newIdeaCount > 0 && (
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm text-positive font-medium"
              >
                +{newIdeaCount} new ideas
              </motion.span>
            )}
          </AnimatePresence>

          {/* Step 1: show proceed button when unlocked */}
          {state.phase === 'voting_step1' && state.step2Unlocked && (
            isAdmin ? (
              <Button onClick={handleProceedToStep2}>
                Proceed to Market Segments
              </Button>
            ) : isCollaborative ? (
              <span className="text-xs text-muted italic">Waiting for admin to advance...</span>
            ) : null
          )}

          {/* Step 2: show proceed button when unlocked */}
          {state.phase === 'voting_step2' && state.step3Unlocked && (
            isAdmin ? (
              <Button onClick={handleProceedToStep3}>
                Proceed to Company Voting
              </Button>
            ) : isCollaborative ? (
              <span className="text-xs text-muted italic">Waiting for admin to advance...</span>
            ) : null
          )}

          {/* View results */}
          {(state.phase === 'voting_step3' ||
            ((state.phase === 'voting_step1' || state.phase === 'voting_step2') && stepVoteCount >= 10)) && (
            <Button
              variant={step3ViewResultsProminent ? 'primary' : 'secondary'}
              onClick={onViewResults}
            >
              View Results ({stepVoteCount} votes)
            </Button>
          )}
        </div>
      </div>

      {/* Keyboard shortcut legend */}
      <div className="text-center text-xs text-dimmed space-x-6">
        <span><kbd className="px-1.5 py-0.5 bg-surface-elevated rounded border border-edge font-mono">A</kbd> Left card</span>
        <span><kbd className="px-1.5 py-0.5 bg-surface-elevated rounded border border-edge font-mono">L</kbd> Right card</span>
        <span><kbd className="px-1.5 py-0.5 bg-surface-elevated rounded border border-edge font-mono">Space</kbd> Skip</span>
      </div>

      {/* Suggest Direction Modal */}
      {showDirectionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-surface-card rounded-xl shadow-2xl border border-edge p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-heading mb-1">Suggest direction</h3>
            <p className="text-sm text-muted mb-4">
              Speak in plain english and use specific examples from the current voting
            </p>
            <textarea
              value={directionText}
              onChange={(e) => setDirectionText(e.target.value)}
              placeholder="Where should we focus more or less on new idea generation?"
              autoFocus
              rows={3}
              className="w-full px-4 py-3 rounded-lg border-2 border-edge focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-sm text-heading bg-surface-elevated placeholder:text-dimmed resize-none"
            />
            {state.userDirections.length > 0 && (
              <div className="mt-3 pt-3 border-t border-edge">
                <p className="text-xs text-dimmed mb-1">Previous suggestions:</p>
                <div className="space-y-1">
                  {state.userDirections.map((d, i) => (
                    <p key={i} className="text-xs text-muted italic">"{d}"</p>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDirectionModal(false);
                  setDirectionText('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitDirection}
                disabled={!directionText.trim()}
              >
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
