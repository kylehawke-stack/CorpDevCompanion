-- CorpDevCompanion Multi-User Collaborative Voting Schema
-- Run this against your Supabase project's SQL editor

-- ============================================================
-- BRIEFING CACHE
-- Stores AI-generated insight cards and strategic ideas so they
-- don't need to be regenerated every session. Keyed by company
-- symbol + card type + peer set. Expires after ~30 days.
-- ============================================================

CREATE TABLE IF NOT EXISTS briefing_cache (
  symbol TEXT NOT NULL,
  card_type TEXT NOT NULL CHECK (card_type IN ('insights', 'competitive', 'strategic_ideas')),
  peer_key TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (symbol, card_type, peer_key)
);

-- Allow public read/write (anon key) — this is non-sensitive cached data
ALTER TABLE briefing_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "briefing_cache_public" ON briefing_cache FOR ALL USING (true) WITH CHECK (true);

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

-- ============================================================
-- CROWD WISDOM PEER STORAGE
-- ============================================================

-- Global cross-session resource keyed by target company symbol.
-- Tracks which peers users select most frequently for each target.
CREATE TABLE IF NOT EXISTS crowd_peers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_symbol TEXT NOT NULL,
  peer_symbol TEXT NOT NULL,
  peer_name TEXT NOT NULL,
  peer_market_cap BIGINT NOT NULL DEFAULT 0,
  peer_industry TEXT NOT NULL DEFAULT '',
  peer_logo TEXT NOT NULL DEFAULT '',
  selection_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(target_symbol, peer_symbol)
);

CREATE INDEX IF NOT EXISTS idx_crowd_peers_target_count
  ON crowd_peers(target_symbol, selection_count DESC);

ALTER TABLE crowd_peers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crowd_peers_allow_all" ON crowd_peers FOR ALL USING (true) WITH CHECK (true);

-- Atomically record a batch of peer selections.
-- Accepts a JSONB array of {symbol, name, marketCap, industry, logo}.
-- Inserts new peers or increments selection_count on conflict.
CREATE OR REPLACE FUNCTION record_peer_selections(
  p_target_symbol TEXT,
  p_peers JSONB
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  peer JSONB;
BEGIN
  FOR peer IN SELECT * FROM jsonb_array_elements(p_peers)
  LOOP
    INSERT INTO crowd_peers (target_symbol, peer_symbol, peer_name, peer_market_cap, peer_industry, peer_logo)
    VALUES (
      p_target_symbol,
      peer->>'symbol',
      peer->>'name',
      COALESCE((peer->>'marketCap')::BIGINT, 0),
      COALESCE(peer->>'industry', ''),
      COALESCE(peer->>'logo', '')
    )
    ON CONFLICT (target_symbol, peer_symbol) DO UPDATE SET
      selection_count = crowd_peers.selection_count + 1,
      peer_name = EXCLUDED.peer_name,
      peer_market_cap = EXCLUDED.peer_market_cap,
      peer_industry = EXCLUDED.peer_industry,
      peer_logo = EXCLUDED.peer_logo,
      updated_at = now();
  END LOOP;
END;
$$;

-- ============================================================
-- REALTIME
-- ============================================================

-- ============================================================
-- BRIEFING CORRECTIONS (iterative AI quality improvement)
-- ============================================================

CREATE TABLE IF NOT EXISTS briefing_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_symbol TEXT NOT NULL,
  card_label TEXT NOT NULL,
  card_index INT NOT NULL DEFAULT 0,
  issue_type TEXT NOT NULL DEFAULT 'other',
  original_text TEXT NOT NULL DEFAULT '',
  user_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_briefing_corrections_symbol
  ON briefing_corrections(target_symbol);

ALTER TABLE briefing_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "briefing_corrections_allow_all" ON briefing_corrections FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- FMP DATA CACHE
-- ============================================================

-- Caches FMP API responses to eliminate redundant calls across functions.
-- Composite key: (endpoint, params_key) where params_key is sorted query params minus apikey.
CREATE TABLE IF NOT EXISTS fmp_cache (
  endpoint TEXT NOT NULL,
  params_key TEXT NOT NULL,
  data_category TEXT NOT NULL DEFAULT 'profile',
  response_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (endpoint, params_key)
);

CREATE INDEX IF NOT EXISTS idx_fmp_cache_category ON fmp_cache(data_category);

ALTER TABLE fmp_cache ENABLE ROW LEVEL SECURITY;

-- Block anon access — only service_role can read/write
CREATE POLICY "fmp_cache_service_only" ON fmp_cache FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Upsert a cache entry (insert or update with fresh timestamp)
CREATE OR REPLACE FUNCTION upsert_fmp_cache(
  p_endpoint TEXT,
  p_params_key TEXT,
  p_data_category TEXT,
  p_response_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO fmp_cache (endpoint, params_key, data_category, response_data, created_at)
  VALUES (p_endpoint, p_params_key, p_data_category, p_response_data, now())
  ON CONFLICT (endpoint, params_key) DO UPDATE SET
    response_data = EXCLUDED.response_data,
    data_category = EXCLUDED.data_category,
    created_at = now();
END;
$$;

-- Get a cache entry if it exists and is within the TTL (in seconds).
-- Returns NULL if missing or expired.
CREATE OR REPLACE FUNCTION get_fmp_cache(
  p_endpoint TEXT,
  p_params_key TEXT,
  p_ttl_seconds INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT response_data INTO result
  FROM fmp_cache
  WHERE endpoint = p_endpoint
    AND params_key = p_params_key
    AND created_at > now() - (p_ttl_seconds || ' seconds')::INTERVAL;
  RETURN result;
END;
$$;

-- Enable realtime for the tables we need to subscribe to
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE ideas;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
