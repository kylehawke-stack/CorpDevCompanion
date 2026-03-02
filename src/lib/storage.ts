import type { GameState } from '../types/index.ts';

const STORAGE_KEY = 'corpdev_companion_state';

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.warn('Failed to save state to localStorage');
  }
}

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed = JSON.parse(raw) as any;

    // Migration: wrap string blurbs in arrays
    if (parsed.ideas) {
      parsed.ideas = parsed.ideas.map((idea: any) => ({
        ...idea,
        blurb: Array.isArray(idea.blurb) ? idea.blurb : [idea.blurb],
      }));
    }

    // Migration: old 'voting' phase → 'voting_step1'
    if (parsed.phase === 'voting') {
      parsed.phase = 'voting_step1';
    }

    // Migration: old 'questions' phase → 'welcome' (can't recover Q&A sessions)
    if (parsed.phase === 'questions') {
      parsed.phase = 'welcome';
    }

    // Migration: old 'transition' phase → 'transition2'
    if (parsed.phase === 'transition') {
      parsed.phase = 'transition2';
    }

    // Migration: add missing new fields
    if (parsed.step1VoteCount === undefined) {
      parsed.step1VoteCount = parsed.totalVoteCount ?? 0;
    }
    if (parsed.step2Unlocked === undefined) {
      parsed.step2Unlocked = false;
    }

    // Migration: add step2VoteCount
    if (parsed.step2VoteCount === undefined) {
      if (parsed.step2Unlocked && parsed.totalVoteCount > parsed.step1VoteCount) {
        parsed.step2VoteCount = parsed.totalVoteCount - parsed.step1VoteCount;
      } else {
        parsed.step2VoteCount = 0;
      }
    }

    // Migration: add step3Unlocked
    if (parsed.step3Unlocked === undefined) {
      parsed.step3Unlocked = false;
    }

    // Migration: add step3VoteCount
    if (parsed.step3VoteCount === undefined) {
      parsed.step3VoteCount = 0;
    }

    // Migration: add userDirections
    if (!Array.isArray(parsed.userDirections)) {
      parsed.userDirections = [];
    }

    // Migration: add financialHighlights and revenueSegments
    if (!Array.isArray(parsed.financialHighlights)) {
      parsed.financialHighlights = [];
    }
    if (!Array.isArray(parsed.revenueSegments)) {
      parsed.revenueSegments = [];
    }

    // Migration: add competitorProfiles
    if (!Array.isArray(parsed.competitorProfiles)) {
      parsed.competitorProfiles = [];
    }

    // Migration: add peer-related fields
    if (!Array.isArray(parsed.availablePeers)) {
      parsed.availablePeers = [];
    }
    if (!Array.isArray(parsed.selectedPeers)) {
      parsed.selectedPeers = [];
    }
    if (!Array.isArray(parsed.peerFinancials)) {
      parsed.peerFinancials = [];
    }

    // Migration: treat peer_selection and peer_benchmarking as transient
    if (parsed.phase === 'peer_selection' || parsed.phase === 'peer_benchmarking') {
      parsed.phase = 'welcome';
    }

    // Migration: remove old Q&A fields
    delete parsed.guidedQuestions;
    delete parsed.userAnswers;

    return parsed as GameState;
  } catch {
    console.warn('Failed to load state from localStorage');
    return null;
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
