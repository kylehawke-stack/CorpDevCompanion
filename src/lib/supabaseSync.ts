import { supabase } from './supabase.ts';
import type { Idea, Vote, GameState, CompanyProfile, FinancialHighlight, RevenueSegment, CompetitorProfile, PeerCompany, PeerFinancials } from '../types/index.ts';

// ─── Type Converters ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ideaToRow(idea: Idea, sessionId: string): Record<string, any> {
  return {
    id: idea.id,
    session_id: sessionId,
    title: idea.title,
    tier: idea.tier,
    blurb: idea.blurb,
    source: idea.source,
    dimension: idea.dimension ?? null,
    dimension_index: idea.dimensionIndex ?? null,
    linked_theme: idea.linkedTheme ?? null,
    tags: idea.tags ?? [],
    website: idea.website ?? null,
    logo_url: idea.logoUrl ?? null,
    created_at: idea.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToIdea(row: any): Idea {
  return {
    id: row.id,
    title: row.title,
    tier: row.tier,
    blurb: row.blurb,
    source: row.source,
    createdAt: row.created_at,
    dimension: row.dimension ?? undefined,
    dimensionIndex: row.dimension_index ?? undefined,
    linkedTheme: row.linked_theme ?? undefined,
    tags: row.tags ?? undefined,
    website: row.website ?? undefined,
    logoUrl: row.logo_url ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function voteToRow(vote: Vote, sessionId: string, phase: string): Record<string, any> {
  return {
    id: vote.id,
    session_id: sessionId,
    voter_id: vote.voterId,
    winner_id: vote.winnerId,
    loser_id: vote.loserId,
    skipped: vote.skipped,
    phase,
    timestamp: vote.timestamp,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToVote(row: any): Vote {
  return {
    id: row.id,
    voterId: row.voter_id,
    winnerId: row.winner_id,
    loserId: row.loser_id,
    skipped: row.skipped,
    timestamp: row.timestamp,
  };
}

// ─── Share Code Generation ──────────────────────────────────────────────

function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for clarity
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── Session CRUD ───────────────────────────────────────────────────────

export interface CreateSessionResult {
  sessionId: string;
  shareCode: string;
}

/**
 * Create a collaborative session from the current solo state.
 * Uploads all ideas, votes, and session metadata to Supabase.
 */
export async function createSession(
  state: GameState,
  voterId: string,
  displayName: string
): Promise<CreateSessionResult> {
  if (!supabase) throw new Error('Supabase not configured');

  const shareCode = generateShareCode();

  // 1. Insert session row
  const { data: session, error: sessionErr } = await supabase
    .from('sessions')
    .insert({
      share_code: shareCode,
      session_name: state.sessionName,
      phase: state.phase,
      admin_voter_id: voterId,
      company_profile: state.companyProfile ?? null,
      financial_highlights: state.financialHighlights,
      revenue_segments: state.revenueSegments,
      competitor_profiles: state.competitorProfiles,
      prompt_data: state.promptData ?? null,
      competitor_prompt_data: state.competitorPromptData ?? null,
      strategic_context: null,
      user_directions: state.userDirections,
      available_peers: state.availablePeers,
      selected_peers: state.selectedPeers,
      peer_financials: state.peerFinancials,
      total_vote_count: state.totalVoteCount,
      step1_vote_count: state.step1VoteCount,
      step2_vote_count: state.step2VoteCount,
      step3_vote_count: state.step3VoteCount,
      last_injection_at_vote_count: state.lastInjectionAtVoteCount,
      step2_unlocked: state.step2Unlocked,
      step3_unlocked: state.step3Unlocked,
    })
    .select('id')
    .single();

  if (sessionErr || !session) throw new Error(sessionErr?.message ?? 'Failed to create session');
  const sessionId = session.id;

  // 2. Insert admin as participant
  await supabase.from('participants').insert({
    session_id: sessionId,
    voter_id: voterId,
    display_name: displayName,
    is_admin: true,
  });

  // 3. Upload existing ideas
  if (state.ideas.length > 0) {
    const ideaRows = state.ideas.map((idea) => ideaToRow(idea, sessionId));
    const { error: ideasErr } = await supabase.from('ideas').insert(ideaRows);
    if (ideasErr) console.error('Failed to upload ideas:', ideasErr);
  }

  // 4. Upload existing votes
  if (state.votes.length > 0) {
    const voteRows = state.votes.map((vote) => voteToRow(vote, sessionId, state.phase));
    const { error: votesErr } = await supabase.from('votes').insert(voteRows);
    if (votesErr) console.error('Failed to upload votes:', votesErr);
  }

  return { sessionId, shareCode };
}

/**
 * Join an existing session by share code.
 * Returns the full session state to hydrate the client.
 */
export async function joinSession(
  shareCode: string,
  voterId: string,
  displayName: string
): Promise<GameState | null> {
  if (!supabase) throw new Error('Supabase not configured');

  // 1. Look up session by share code
  const { data: session, error: sessionErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('share_code', shareCode.toUpperCase())
    .single();

  if (sessionErr || !session) return null;

  // 2. Upsert participant (idempotent rejoin)
  await supabase.from('participants').upsert(
    {
      session_id: session.id,
      voter_id: voterId,
      display_name: displayName,
      is_admin: session.admin_voter_id === voterId,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'session_id,voter_id' }
  );

  // 3. Load all ideas
  const { data: ideaRows } = await supabase
    .from('ideas')
    .select('*')
    .eq('session_id', session.id);
  const ideas: Idea[] = (ideaRows ?? []).map(rowToIdea);

  // 4. Load all votes
  const { data: voteRows } = await supabase
    .from('votes')
    .select('*')
    .eq('session_id', session.id);
  const votes: Vote[] = (voteRows ?? []).map(rowToVote);

  // 5. Construct GameState
  const gameState: GameState = {
    sessionName: session.session_name,
    voterId,
    ideas,
    votes,
    totalVoteCount: session.total_vote_count,
    lastInjectionAtVoteCount: session.last_injection_at_vote_count,
    phase: session.phase,
    // strategicContext removed — field kept in DB for backward compat
    step1VoteCount: session.step1_vote_count,
    step2VoteCount: session.step2_vote_count,
    step3VoteCount: session.step3_vote_count,
    step2Unlocked: session.step2_unlocked,
    step3Unlocked: session.step3_unlocked,
    companyProfile: session.company_profile as CompanyProfile | undefined,
    financialHighlights: (session.financial_highlights ?? []) as FinancialHighlight[],
    revenueSegments: (session.revenue_segments ?? []) as RevenueSegment[],
    competitorProfiles: (session.competitor_profiles ?? []) as CompetitorProfile[],
    userDirections: (session.user_directions ?? []) as string[],
    availablePeers: (session.available_peers ?? []) as PeerCompany[],
    selectedPeers: (session.selected_peers ?? []) as string[],
    peerFinancials: (session.peer_financials ?? []) as PeerFinancials[],
    promptData: session.prompt_data ?? undefined,
    competitorPromptData: session.competitor_prompt_data ?? undefined,
    // Session fields
    sessionId: session.id,
    shareCode: session.share_code,
    adminVoterId: session.admin_voter_id,
    isCollaborative: true,
  };

  return gameState;
}

/**
 * Load a session from Supabase by sessionId (for reconnection).
 */
export async function loadSession(sessionId: string, voterId: string): Promise<GameState | null> {
  if (!supabase) return null;

  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session) return null;

  // Update last_seen
  await supabase.from('participants')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .eq('voter_id', voterId);

  const { data: ideaRows } = await supabase.from('ideas').select('*').eq('session_id', sessionId);
  const { data: voteRows } = await supabase.from('votes').select('*').eq('session_id', sessionId);

  const ideas: Idea[] = (ideaRows ?? []).map(rowToIdea);
  const votes: Vote[] = (voteRows ?? []).map(rowToVote);

  return {
    sessionName: session.session_name,
    voterId,
    ideas,
    votes,
    totalVoteCount: session.total_vote_count,
    lastInjectionAtVoteCount: session.last_injection_at_vote_count,
    phase: session.phase,
    // strategicContext removed — field kept in DB for backward compat
    step1VoteCount: session.step1_vote_count,
    step2VoteCount: session.step2_vote_count,
    step3VoteCount: session.step3_vote_count,
    step2Unlocked: session.step2_unlocked,
    step3Unlocked: session.step3_unlocked,
    companyProfile: session.company_profile as CompanyProfile | undefined,
    financialHighlights: (session.financial_highlights ?? []) as FinancialHighlight[],
    revenueSegments: (session.revenue_segments ?? []) as RevenueSegment[],
    competitorProfiles: (session.competitor_profiles ?? []) as CompetitorProfile[],
    userDirections: (session.user_directions ?? []) as string[],
    availablePeers: (session.available_peers ?? []) as PeerCompany[],
    selectedPeers: (session.selected_peers ?? []) as string[],
    peerFinancials: (session.peer_financials ?? []) as PeerFinancials[],
    promptData: session.prompt_data ?? undefined,
    competitorPromptData: session.competitor_prompt_data ?? undefined,
    sessionId: session.id,
    shareCode: session.share_code,
    adminVoterId: session.admin_voter_id,
    isCollaborative: true,
  };
}

// ─── Real-time Sync Operations ──────────────────────────────────────────

/**
 * Sync a local vote to Supabase. Uses the atomic RPC to insert + increment counters.
 * Returns the new authoritative counter values.
 */
export async function syncVote(
  vote: Vote,
  sessionId: string,
  phase: string
): Promise<{ totalVoteCount: number; step1VoteCount: number; step2VoteCount: number; step3VoteCount: number } | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('insert_vote_and_increment', {
    p_vote_id: vote.id,
    p_session_id: sessionId,
    p_voter_id: vote.voterId,
    p_winner_id: vote.winnerId,
    p_loser_id: vote.loserId,
    p_skipped: vote.skipped,
    p_phase: phase,
    p_timestamp: vote.timestamp,
  });

  if (error) {
    console.error('syncVote RPC failed:', error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    totalVoteCount: row.new_total_vote_count,
    step1VoteCount: row.new_step1_vote_count,
    step2VoteCount: row.new_step2_vote_count,
    step3VoteCount: row.new_step3_vote_count,
  };
}

/**
 * Sync newly generated ideas to Supabase.
 */
export async function syncIdeas(ideas: Idea[], sessionId: string): Promise<void> {
  if (!supabase || ideas.length === 0) return;

  const rows = ideas.map((idea) => ideaToRow(idea, sessionId));
  const { error } = await supabase.from('ideas').upsert(rows, { onConflict: 'id' });
  if (error) console.error('syncIdeas failed:', error);
}

/**
 * Sync a phase change to Supabase (admin only).
 */
export async function syncPhaseChange(sessionId: string, phase: string, extras?: Record<string, unknown>): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('sessions')
    .update({ phase, updated_at: new Date().toISOString(), ...extras })
    .eq('id', sessionId);

  if (error) console.error('syncPhaseChange failed:', error);
}

/**
 * Claim the injection lock. Returns true if this client won (should trigger injection).
 */
export async function claimInjectionLock(
  sessionId: string,
  expectedLast: number,
  newLast: number
): Promise<boolean> {
  if (!supabase) return true; // solo mode always wins

  const { data, error } = await supabase.rpc('claim_injection_lock', {
    p_session_id: sessionId,
    p_expected_last: expectedLast,
    p_new_last: newLast,
  });

  if (error) {
    console.error('claimInjectionLock RPC failed:', error);
    return false;
  }

  return data === true;
}

/**
 * Get participant count for a session.
 */
export async function getParticipantCount(sessionId: string): Promise<number> {
  if (!supabase) return 1;

  const { count, error } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  if (error) return 1;
  return count ?? 1;
}

/**
 * Update session metadata (for syncing step unlocks, user directions, etc.)
 */
export async function updateSessionField(
  sessionId: string,
  fields: Record<string, unknown>
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('sessions')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) console.error('updateSessionField failed:', error);
}
