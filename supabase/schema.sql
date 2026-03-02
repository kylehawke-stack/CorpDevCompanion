-- CorpDevCompanion Multi-User Collaborative Voting Schema
-- Run this against your Supabase project's SQL editor

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code CHAR(8) UNIQUE NOT NULL,
  session_name TEXT NOT NULL DEFAULT '',

  -- Phase mirrors GameState.phase
  phase TEXT NOT NULL DEFAULT 'briefing',

  -- The voter_id of the session creator (admin)
  admin_voter_id UUID NOT NULL,

  -- Company data (JSONB for flexibility)
  company_profile JSONB,
  financial_highlights JSONB DEFAULT '[]'::jsonb,
  revenue_segments JSONB DEFAULT '[]'::jsonb,
  competitor_profiles JSONB DEFAULT '[]'::jsonb,

  -- Cached prompt data (large text, never broadcast via Realtime)
  prompt_data TEXT,
  competitor_prompt_data TEXT,

  -- Context
  strategic_context JSONB,
  user_directions JSONB DEFAULT '[]'::jsonb,
  available_peers JSONB DEFAULT '[]'::jsonb,
  selected_peers JSONB DEFAULT '[]'::jsonb,
  peer_financials JSONB DEFAULT '[]'::jsonb,

  -- Vote counters (authoritative source of truth)
  total_vote_count INT NOT NULL DEFAULT 0,
  step1_vote_count INT NOT NULL DEFAULT 0,
  step2_vote_count INT NOT NULL DEFAULT 0,
  step3_vote_count INT NOT NULL DEFAULT 0,
  last_injection_at_vote_count INT NOT NULL DEFAULT 0,
  step2_unlocked BOOLEAN NOT NULL DEFAULT false,
  step3_unlocked BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Anonymous',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, voter_id)
);

CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY, -- matches client-side Idea.id
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tier TEXT NOT NULL,
  blurb JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'seed',
  dimension TEXT,
  dimension_index INT,
  linked_theme TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  website TEXT,
  logo_url TEXT,
  created_at BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY, -- matches client-side Vote.id
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  winner_id UUID NOT NULL,
  loser_id UUID NOT NULL,
  skipped BOOLEAN NOT NULL DEFAULT false,
  phase TEXT NOT NULL,
  timestamp BIGINT NOT NULL DEFAULT 0
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_sessions_share_code ON sessions(share_code);
CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_voter ON participants(voter_id);
CREATE INDEX IF NOT EXISTS idx_ideas_session ON ideas(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_session ON votes(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_session_voter ON votes(session_id, voter_id);

-- ============================================================
-- RLS (permissive for now — share code is the access control)
-- ============================================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Allow all operations with anon key (auth tightens later)
CREATE POLICY "sessions_allow_all" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "participants_allow_all" ON participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "ideas_allow_all" ON ideas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "votes_allow_all" ON votes FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Atomically insert a vote and increment session counters.
-- Returns the new counter values so the client knows if an injection threshold was crossed.
CREATE OR REPLACE FUNCTION insert_vote_and_increment(
  p_vote_id UUID,
  p_session_id UUID,
  p_voter_id UUID,
  p_winner_id UUID,
  p_loser_id UUID,
  p_skipped BOOLEAN,
  p_phase TEXT,
  p_timestamp BIGINT
)
RETURNS TABLE(
  new_total_vote_count INT,
  new_step1_vote_count INT,
  new_step2_vote_count INT,
  new_step3_vote_count INT,
  new_last_injection_at_vote_count INT
)
LANGUAGE plpgsql AS $$
BEGIN
  -- Insert the vote
  INSERT INTO votes (id, session_id, voter_id, winner_id, loser_id, skipped, phase, timestamp)
  VALUES (p_vote_id, p_session_id, p_voter_id, p_winner_id, p_loser_id, p_skipped, p_phase, p_timestamp)
  ON CONFLICT (id) DO NOTHING;

  -- Increment counters
  UPDATE sessions SET
    total_vote_count = total_vote_count + 1,
    step1_vote_count = step1_vote_count + CASE WHEN p_phase = 'voting_step1' THEN 1 ELSE 0 END,
    step2_vote_count = step2_vote_count + CASE WHEN p_phase = 'voting_step2' THEN 1 ELSE 0 END,
    step3_vote_count = step3_vote_count + CASE WHEN p_phase = 'voting_step3' THEN 1 ELSE 0 END,
    updated_at = now()
  WHERE id = p_session_id;

  -- Return new values
  RETURN QUERY
    SELECT s.total_vote_count, s.step1_vote_count, s.step2_vote_count, s.step3_vote_count, s.last_injection_at_vote_count
    FROM sessions s WHERE s.id = p_session_id;
END;
$$;

-- Compare-and-swap on last_injection_at_vote_count.
-- Only one client wins per injection threshold crossing.
-- Returns true if this caller won the lock (should trigger injection).
CREATE OR REPLACE FUNCTION claim_injection_lock(
  p_session_id UUID,
  p_expected_last INT,
  p_new_last INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE
  rows_updated INT;
BEGIN
  UPDATE sessions
  SET last_injection_at_vote_count = p_new_last, updated_at = now()
  WHERE id = p_session_id AND last_injection_at_vote_count = p_expected_last;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

-- ============================================================
-- REALTIME
-- ============================================================

-- Enable realtime for the tables we need to subscribe to
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE ideas;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
