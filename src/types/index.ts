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

export interface RevenueSegment {
  name: string;
  revenue: number;
  percent: number;
}

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
