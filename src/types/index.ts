export type Tier = 'strategic_priority' | 'market_segment' | 'product_category' | 'specific_company';

export type IdeaSource = 'seed' | 'claude_injected' | 'manual' | 'inven_sourced';

export interface Idea {
  id: string;
  title: string;
  tier: Tier;
  blurb: string[];
  source: IdeaSource;
  createdAt: number;
  website?: string;
  logoUrl?: string;
  tags?: string[];
  dimension?: string;
  dimensionIndex?: number;
  linkedTheme?: string;
}

export interface Vote {
  id: string;
  voterId: string;
  winnerId: string;
  loserId: string;
  skipped: boolean;
  timestamp: number;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
}

export interface RankedIdea {
  idea: Idea;
  strength: number;
  displayScore: number;
  wins: number;
  losses: number;
  rank: number;
  confidenceInterval: ConfidenceInterval;
}

export interface StrategicContext {
  freeText: string;
  earningsTranscript: string;
  analystNotes: string;
}

export interface CompanyProfile {
  symbol: string;
  companyName: string;
  description: string;
  marketCap: number;
  price: number;
  sector: string;
  industry: string;
  ceo: string;
  fullTimeEmployees: string;
  website: string;
  image: string;
  country: string;
}

export interface FinancialHighlight {
  label: string;
  value: string;
  detail: string;
  observation: string;
}

// ─── Intelligence Briefing Data Contract ───────────────────────────────
// These types define what the redesigned BriefingPage expects.
// The KPI strip is derived from existing FinancialHighlight[] by label.
// Quotes are extracted from the AI-generated insight cards (Earnings Call
// Insights + Analyst Perspectives) via regex on the observation field.
//
// BACKEND NOTE (for Claude Code):
// If you add structured quote fields to the generate-briefing response,
// update BriefingQuote and the GameState accordingly. Until then, the
// frontend parses quotes from the observation text.

/**
 * KPI strip item -- derived on the frontend from FinancialHighlight[].
 * Maps specific highlight labels to the 4-stat summary row.
 */
export interface BriefingKPI {
  label: string;       // Display label (e.g. "Revenue", "Firepower")
  value: string;       // The highlight's `value` field (e.g. "$618M", "0.87x")
  delta: string;       // The highlight's `detail` field (e.g. "+3.2% YoY growth")
}

/**
 * Which FinancialHighlight labels map to the 4 KPI strip slots.
 * Order matters -- this is the left-to-right display order.
 */
export const BRIEFING_KPI_LABELS = [
  'Revenue & Growth',
  'Profitability',
  'Leverage & Capacity',
  'Acquisition Firepower',
] as const;

/**
 * Structured quote for pullquote cards.
 * Currently parsed from observation text via regex.
 * Future: backend could return these as first-class fields.
 */
export interface BriefingQuote {
  text: string;         // The quote itself (no surrounding quotes)
  speaker: string;      // Attribution (e.g. "CEO Scott Tidey")
}

/**
 * Card groupings for the Intelligence Briefing layout.
 * - kpiLabels: shown in the 4-stat KPI strip (number only, no narrative)
 * - narrativeLabels: shown in the 2-column analysis grid (narrative only)
 * - pullquoteLabels: shown as full-width cards with emphasized quotes
 */
export const BRIEFING_CARD_GROUPS = {
  kpiLabels: ['Revenue & Growth', 'Profitability', 'Leverage & Capacity', 'Acquisition Firepower'],
  narrativeLabels: ['Revenue & Growth', 'Profitability', 'Cash Flow & Firepower', 'Acquisitiveness', 'Leverage & Capacity', 'Competitive Positioning'],
  pullquoteLabels: ['Earnings Call Insights', 'Analyst Perspectives'],
} as const;

export interface RevenueSegment {
  name: string;
  revenue: number;
  percent: number;
}

// ─── Dimension Metadata for Results Page ───────────────────────────────
// These descriptions come from the generate-briefing prompt (lines 86-108).
// The frontend uses them to replace generic "Conservative"/"Aggressive" axis
// labels with meaningful context for each dimension.
//
// BACKEND NOTE (for Claude Code):
// If the AI generates new/different dimension names, either add them here
// or return description + leftLabel + rightLabel in the DimensionSpectrum
// response. Until then the frontend falls back to the dimension name + generic labels.

export interface DimensionMeta {
  description: string;  // What this dimension measures
  leftLabel: string;    // What the left (conservative/index 0) end means
  rightLabel: string;   // What the right (aggressive/max index) end means
}

export const DIMENSION_METADATA: Record<string, DimensionMeta> = {
  'Growth Objective': {
    description: 'What is the main strategic goal of acquisitions?',
    leftLabel: 'Safe / incremental',
    rightLabel: 'Bold / transformational',
  },
  'Target Profile': {
    description: 'What kind of company should we acquire?',
    leftLabel: 'Safe / proven',
    rightLabel: 'Risky / innovative',
  },
  'Risk Posture': {
    description: 'How aggressive should the M&A strategy be?',
    leftLabel: 'Cautious',
    rightLabel: 'Bold',
  },
  'Integration': {
    description: 'How will acquired companies fit into the portfolio?',
    leftLabel: 'Tightest integration',
    rightLabel: 'Most independent',
  },
  'Capability Priority': {
    description: 'What capability matters most in a target?',
    leftLabel: 'Operational / tangible',
    rightLabel: 'Strategic / intangible',
  },
  'Strategic Proximity': {
    description: 'How far from the core business should acquisitions venture?',
    leftLabel: 'Closest to core',
    rightLabel: 'Furthest from core',
  },
};

export interface CompetitorProfile {
  symbol: string;
  name: string;
  marketCap: number;
  industry: string;
  productSegments: string[];
  isDirect: boolean;
}

export interface PeerCompany {
  symbol: string;
  name: string;
  marketCap: number;
  industry: string;
  logo: string;
}

export interface PeerFinancials {
  symbol: string;
  name: string;
  logo: string;

  // ── Existing fields (already populated by fetch-peer-data) ──
  revenue: number;
  revenueFormatted?: string;
  grossProfit: number;
  grossProfitFormatted?: string;
  grossMarginPct: number;
  netIncome: number;
  netIncomeFormatted?: string;
  netMarginPct: number;
  operatingMarginPct?: number;
  ebitda?: number;
  ebitdaFormatted?: string;
  marketCap?: number;
  marketCapFormatted?: string;
  peRatio?: number;
  evToEbitda?: number;
  returnOnEquity?: number;
  debtToEquity?: number;
  currentRatio?: number;
  employees?: number;

  // ── NEW: Ability to Acquire (Financial Strength) ──────────────
  // BACKEND NOTE (Claude Code): These fields come from FMP APIs that
  // fetch-peer-data already calls. Most just need to be extracted from
  // the existing response and passed through.

  /** Free Cash Flow = operatingCashFlow - capitalExpenditure.
   *  Source: FMP cashflow-statement (need to add this fetch for peers). */
  freeCashFlow?: number;

  /** Cash on hand. Source: FMP balance-sheet-statement.cashAndCashEquivalents.
   *  Already fetched in fetch-peer-data (balance sheet call), just not passed through. */
  cashAndCashEquivalents?: number;

  /** Total debt. Source: FMP balance-sheet-statement.totalDebt.
   *  Already fetched in fetch-peer-data (balance sheet call), just not passed through. */
  totalDebt?: number;

  /** Interest Coverage = EBIT / interestExpense. Source: FMP key-metrics.interestCoverage.
   *  Already in the key-metrics API response, just not extracted. */
  interestCoverage?: number;

  /** EBITDA Margin = ebitda / revenue. Can be computed on frontend if ebitda + revenue exist,
   *  but cleaner to pass through. */
  ebitdaMarginPct?: number;

  // ── NEW: M&A Strategy (Growth & Valuation) ────────────────────

  /** YoY revenue growth %. Source: fetch 2 years of income-statement instead of 1,
   *  compute (year0 - year1) / year1 * 100. Currently only fetched for target company. */
  revenueGrowthPct?: number;

  /** Return on Invested Capital. Source: FMP key-metrics.roic.
   *  Already in the key-metrics API response, just not extracted. */
  roic?: number;

  /** Net acquisitions spend (most recent year). Source: FMP cashflow-statement.acquisitionsNet.
   *  Need to add cashflow-statement fetch for peers. Already fetched for target in analyze-company. */
  acquisitionsNet?: number;

  // ── NEW: Computed Firepower ───────────────────────────────────

  /** Estimated acquisition firepower.
   *  Formula: cashAndCashEquivalents + max(freeCashFlow * 1.5, 0)
   *  This matches the formula in analyze-company.mts for the target.
   *  Can be computed on frontend if cash + FCF are provided, but cleaner server-side. */
  estimatedFirepower?: number;
}

export interface GameState {
  sessionName: string;
  voterId: string;
  ideas: Idea[];
  votes: Vote[];
  totalVoteCount: number;
  lastInjectionAtVoteCount: number;
  phase: 'welcome' | 'analyzing' | 'peer_selection' | 'peer_benchmarking' | 'briefing' | 'voting_step1' | 'transition1' | 'voting_step2' | 'transition2' | 'voting_step3' | 'results';
  strategicContext?: StrategicContext;
  step1VoteCount: number;
  step2VoteCount: number;
  step3VoteCount: number;
  step2Unlocked: boolean;
  step3Unlocked: boolean;
  companyProfile?: CompanyProfile;
  financialHighlights: FinancialHighlight[];
  revenueSegments: RevenueSegment[];
  competitorProfiles: CompetitorProfile[];
  userDirections: string[];
  availablePeers: PeerCompany[];
  selectedPeers: string[];
  peerFinancials: PeerFinancials[];
  promptData?: string;
  competitorPromptData?: string;
}

export type GameAction =
  | { type: 'START_ANALYSIS'; companyProfile: CompanyProfile }
  | { type: 'SET_STRATEGIC_IDEAS'; ideas: Idea[]; highlights: FinancialHighlight[]; revenueSegments: RevenueSegment[]; competitorProfiles: CompetitorProfile[]; promptData?: string }
  | { type: 'ADD_VOTE'; vote: Vote }
  | { type: 'ADD_IDEAS'; ideas: Idea[] }
  | { type: 'SET_INJECTION_COUNT'; count: number }
  | { type: 'SET_PHASE'; phase: GameState['phase'] }
  | { type: 'LOAD_STATE'; state: GameState }
  | { type: 'UNLOCK_STEP2' }
  | { type: 'START_STEP2'; segmentIdeas: Idea[] }
  | { type: 'UNLOCK_STEP3' }
  | { type: 'START_STEP3'; companyIdeas: Idea[] }
  | { type: 'ADD_DIRECTION'; direction: string }
  | { type: 'SET_AVAILABLE_PEERS'; peers: PeerCompany[]; promptData: string }
  | { type: 'SELECT_PEERS'; symbols: string[] }
  | { type: 'SET_PEER_FINANCIALS'; peerFinancials: PeerFinancials[]; competitorPromptData?: string }
  | { type: 'RESET_SESSION' };
