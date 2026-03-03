# CorpDevCompanion

M&A target prioritization app for Hamilton Beach Brands (HBB).
React 19 + Vite + Tailwind 4 frontend, Netlify Functions (.mts) backend, Claude API for AI, Supabase for multi-user.

## Quick Reference

- **Project path**: `/mnt/c/Users/brady/projects/CorpDevCompanion`
- **Dev server**: `netlify dev` (NOT `npm run dev` — saves Netlify build credits)
- **Build**: `npm run build` (runs vitest + tsc + vite build)
- **Tests**: `npm test` or `npm run test:watch`
- **Deploy**: Push to `master` branch (Netlify auto-deploys)

## Architecture

### App Flow (Phases)
```
welcome → analyzing → peer_selection → peer_benchmarking → briefing
→ voting_step1 → transition1 → voting_step2 → transition2 → voting_step3 → results
```

### Data Flow
```
WelcomePage → analyze-company (FMP API) → promptData (~20K chars)
  → generate-briefing (Claude) → insight cards + Step 1 strategic priority ideas
  → fetch-peers (FMP SIC codes) → PeerSelectionPage → fetch-peer-data (FMP)
  → PeerBenchmarkPage → BriefingPage → voting_step1
  → TransitionPage → generate-ideas (Claude) → voting_step2
  → TransitionPage → generate-company-ideas (Claude) → voting_step3
  → ResultsPage (Bradley-Terry MLE rankings + spectrum visualization)
```

### Key Directories
```
src/types/index.ts          — Central type definitions (Idea, GameState, Vote, etc.)
src/context/GameStateContext.tsx — useReducer state management + localStorage persistence
src/App.tsx                 — Hash-based routing, phase→page mapping
src/pages/                  — One page per phase (WelcomePage, BriefingPage, VotePage, etc.)
src/components/voting/      — VotingArena, IdeaCard, ProgressBar
src/components/dashboard/   — RankingTable, SpectrumResults, StrategicNarrative
src/components/session/     — SessionBar, JoinSessionPage, CreateSessionModal
src/hooks/                  — useVoting, useSession, useIdeaInjection, useSupabaseRealtime
src/lib/                    — api.ts, bradleyTerry.ts, pairingEngine.ts, storage.ts, supabase*.ts
netlify/functions/          — All backend endpoints (.mts files)
supabase/schema.sql         — Database schema for multi-user collaboration
```

### Netlify Functions
| Function | Purpose | API |
|----------|---------|-----|
| `analyze-company.mts` | Fetch financials, build promptData | FMP |
| `generate-briefing.mts` | Insight cards + Step 1 ideas | Claude |
| `generate-ideas.mts` | Step 2 seed ideas (segments/categories) | Claude |
| `generate-company-ideas.mts` | Step 3 seed ideas (~20 companies) | Claude |
| `inject-ideas.mts` | Dynamic ideas every 5 votes (Steps 2-3) | Claude |
| `fetch-peers.mts` | SIC code peer discovery | FMP |
| `fetch-peer-data.mts` | Peer financial statements | FMP |
| `search-company.mts` | Company symbol lookup | FMP |

### Voting System
- **3 steps**: Strategic Priorities → Market Segments/Product Categories → Specific Companies
- **Bradley-Terry MLE** ranking with Elo-equivalent scores (median 1500)
- **Pairing engine**: New item boost (50%), CI overlap targeting, tier-aware funnel weights
- **Idea injection**: Every 5 votes in Steps 2-3, with Jaccard duplicate detection (≥0.7)
- **Step unlocking**: Step 2 after 25 votes, Step 3 after 50 votes

### Multi-User (Supabase)
- Admin creates session from BriefingPage "Go Live" button
- Others join via `?s=SHARE_CODE` URL
- Anonymous UUID voter identity (no auth)
- Realtime sync: votes, ideas, sessions, participants
- Atomic operations: `insert_vote_and_increment` RPC, `claim_injection_lock` RPC
- Solo mode works without Supabase env vars

### Prompt Caching
All Claude functions use ephemeral prompt caching on `promptData`:
```typescript
{ role: "user", content: [
  { type: "text", text: promptData, cache_control: { type: "ephemeral" } },
  { type: "text", text: actualPrompt }
]}
```

## Environment Variables
```
ANTHROPIC_API_KEY=sk-ant-...        # Claude API (required)
FMP_API_KEY=...                     # Financial Modeling Prep (required)
VITE_SUPABASE_URL=https://...       # Supabase project URL (optional, enables multi-user)
VITE_SUPABASE_ANON_KEY=...          # Supabase anon key (optional)
```

## Conventions

- Claude model in functions: `claude-sonnet-4-20250514`
- All Netlify functions use `.mts` extension (ESM TypeScript)
- State persisted to localStorage key `corpdev_companion_state`
- Hash-based routing (`window.location.hash`)
- Framer Motion for animations
- Fonts: Inter (body), JetBrains Mono (code/data)
- Always run `netlify dev` after code changes so the user can test locally
- Do not over-engineer — keep changes focused on what was asked
