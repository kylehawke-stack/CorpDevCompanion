import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from 'react';
import type { GameState, GameAction } from '../types/index.ts';
import { saveState, loadState, clearState } from '../lib/storage.ts';
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime.ts';

const initialState: GameState = {
  sessionName: '',
  voterId: '',
  ideas: [],
  votes: [],
  totalVoteCount: 0,
  lastInjectionAtVoteCount: 0,
  phase: 'welcome',
  step1VoteCount: 0,
  step2VoteCount: 0,
  step3VoteCount: 0,
  step2Unlocked: false,
  step3Unlocked: false,
  financialHighlights: [],
  revenueSegments: [],
  competitorProfiles: [],
  userDirections: [],
  availablePeers: [],
  selectedPeers: [],
  peerFinancials: [],
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_ANALYSIS': {
      // If user is on the how_it_works page, keep them there while fetches run
      const nextPhase = state.phase === 'how_it_works' ? 'how_it_works' : 'analyzing';
      return {
        ...state,
        companyProfile: action.companyProfile,
        sessionName: `${action.companyProfile.companyName} — ${new Date().toLocaleDateString()}`,
        phase: nextPhase,
      };
    }
    case 'SET_STRATEGIC_IDEAS': {
      // Don't change phase if user is in how_it_works, peer selection, or benchmarking flow
      const keepPhase = state.phase === 'how_it_works' || state.phase === 'peer_selection' || state.phase === 'peer_benchmarking';
      return {
        ...state,
        voterId: crypto.randomUUID(),
        ideas: action.ideas,
        financialHighlights: action.highlights,
        revenueSegments: action.revenueSegments,
        competitorProfiles: action.competitorProfiles,
        promptData: action.promptData ?? state.promptData,
        votes: [],
        totalVoteCount: 0,
        lastInjectionAtVoteCount: 0,
        phase: keepPhase ? state.phase : 'briefing',
        step1VoteCount: 0,
        step2VoteCount: 0,
        step3VoteCount: 0,
        step2Unlocked: false,
        step3Unlocked: false,
        userDirections: [],
      };
    }
    case 'ADD_VOTE': {
      const newTotal = state.totalVoteCount + 1;
      const newStep1 = state.phase === 'voting_step1'
        ? state.step1VoteCount + 1
        : state.step1VoteCount;
      const newStep2 = state.phase === 'voting_step2'
        ? state.step2VoteCount + 1
        : state.step2VoteCount;
      const newStep3 = state.phase === 'voting_step3'
        ? state.step3VoteCount + 1
        : state.step3VoteCount;
      return {
        ...state,
        votes: [...state.votes, action.vote],
        totalVoteCount: newTotal,
        step1VoteCount: newStep1,
        step2VoteCount: newStep2,
        step3VoteCount: newStep3,
      };
    }
    case 'ADD_IDEAS':
      return {
        ...state,
        ideas: [...state.ideas, ...action.ideas],
      };
    case 'SET_INJECTION_COUNT':
      return {
        ...state,
        lastInjectionAtVoteCount: action.count,
      };
    case 'SET_PHASE':
      return {
        ...state,
        phase: action.phase,
      };
    case 'LOAD_STATE':
      return action.state;
    case 'UNLOCK_STEP2':
      return {
        ...state,
        step2Unlocked: true,
      };
    case 'START_STEP2':
      return {
        ...state,
        ideas: [...state.ideas, ...action.segmentIdeas],
        phase: 'voting_step2',
        lastInjectionAtVoteCount: state.totalVoteCount,
      };
    case 'UNLOCK_STEP3':
      return {
        ...state,
        step3Unlocked: true,
      };
    case 'START_STEP3':
      return {
        ...state,
        ideas: [...state.ideas, ...action.companyIdeas],
        phase: 'voting_step3',
        lastInjectionAtVoteCount: state.totalVoteCount,
      };
    case 'ADD_DIRECTION':
      return {
        ...state,
        userDirections: [...state.userDirections, action.direction],
      };
    case 'SET_AVAILABLE_PEERS': {
      // If user is on the how_it_works page, keep them there
      const peersPhase = state.phase === 'how_it_works' ? 'how_it_works' : 'peer_selection';
      return {
        ...state,
        availablePeers: action.peers,
        promptData: action.promptData,
        phase: peersPhase,
      };
    }
    case 'SELECT_PEERS':
      return {
        ...state,
        selectedPeers: action.symbols,
      };
    case 'SET_PEER_FINANCIALS':
      return {
        ...state,
        peerFinancials: action.peerFinancials,
        competitorPromptData: action.competitorPromptData ?? state.competitorPromptData,
        phase: 'briefing',
      };
    case 'RESET_SESSION':
      clearState();
      return { ...initialState };

    // ── Multi-user collaborative actions ──────────────────────────────
    case 'SET_SESSION_INFO':
      return {
        ...state,
        sessionId: action.sessionId,
        shareCode: action.shareCode,
        adminVoterId: action.adminVoterId,
        isCollaborative: action.isCollaborative,
      };
    case 'LOAD_SESSION':
      return action.state;
    case 'REMOTE_VOTE': {
      // Dedup: skip if this vote already exists locally
      if (state.votes.some((v) => v.id === action.vote.id)) return state;
      return {
        ...state,
        votes: [...state.votes, action.vote],
        totalVoteCount: action.counters.totalVoteCount,
        step1VoteCount: action.counters.step1VoteCount,
        step2VoteCount: action.counters.step2VoteCount,
        step3VoteCount: action.counters.step3VoteCount,
      };
    }
    case 'REMOTE_IDEAS': {
      // Dedup: only add ideas not already present
      const existingIds = new Set(state.ideas.map((i) => i.id));
      const newIdeas = action.ideas.filter((i) => !existingIds.has(i.id));
      if (newIdeas.length === 0) return state;
      return {
        ...state,
        ideas: [...state.ideas, ...newIdeas],
      };
    }
    case 'REMOTE_SESSION_UPDATE':
      return {
        ...state,
        ...action.changes,
      };

    default:
      return state;
  }
}

type BriefingPromise = Promise<{ highlights: import('../types/index.ts').FinancialHighlight[]; ideas: import('../types/index.ts').Idea[] }>;

interface GameStateContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  setBriefingPromise: (p: BriefingPromise) => void;
  getBriefingPromise: () => BriefingPromise | null;
}

const GameStateContext = createContext<GameStateContextValue | null>(null);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState, () => {
    const saved = loadState();
    return saved ?? initialState;
  });

  // Briefing promise ref — survives re-renders, no state churn
  const briefingPromiseRef = useRef<BriefingPromise | null>(null);
  const setBriefingPromise = (p: BriefingPromise) => { briefingPromiseRef.current = p; };
  const getBriefingPromise = () => briefingPromiseRef.current;

  // Persist state changes
  useEffect(() => {
    if (state.phase !== 'welcome') {
      saveState(state);
    }
  }, [state]);

  // Subscribe to Supabase Realtime when in a collaborative session
  useSupabaseRealtime(state.sessionId, state.voterId, dispatch);

  return (
    <GameStateContext.Provider value={{ state, dispatch, setBriefingPromise, getBriefingPromise }}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState(): GameStateContextValue {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used within GameStateProvider');
  return ctx;
}
