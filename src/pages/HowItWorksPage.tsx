import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameState } from '../context/GameStateContext.tsx';
import { analyzeCompany, generateBriefing, fetchPeers } from '../lib/api.ts';
import type { PeerCompany } from '../types/index.ts';

// ── Step / Zone data ────────────────────────────────────────────────────

const ZONES = [
  {
    zoneLabel: 'THE SYSTEM DOES THE HOMEWORK',
    color: '#64748b',
    steps: [
      {
        num: 1,
        shortLabel: 'Analyze',
        title: 'Company Analysis',
        badge: 'System',
        badgeColor: '#64748b',
        description:
          "Corp Dev Companion ingests your company\u2019s financial statements, earnings calls, analyst coverage, and competitive data to build a complete picture of the company\u2019s M&A starting position \u2014 revenue trajectory, margins, leverage, acquisition history, and available firepower.",
        outputs: ['Financial highlights', 'Revenue mix breakdown', 'Acquisition firepower estimate', 'Earnings call insights', 'Analyst perspectives'],
      },
      {
        num: 2,
        shortLabel: 'Benchmark',
        title: 'Peer Benchmarking',
        badge: 'System',
        badgeColor: '#64748b',
        description:
          'Selected competitors are benchmarked across the same key metric \u2014 revenue, margins, valuation, returns on capital, leverage, and acquisition firepower. This shows where the company leads, lags, and has room to grow through M&A.',
        outputs: ['Peer financial comparison', 'Relative valuation analysis', 'Historical acquisitiveness', 'Competitive firepower ranking'],
      },
    ],
  },
  {
    zoneLabel: 'YOUR TEAM SETS THE DIRECTION',
    color: '#f97316',
    steps: [
      {
        num: 3,
        shortLabel: 'Strategy',
        title: 'Strategic Priorities',
        badge: 'Team Input',
        badgeColor: '#f97316',
        voteInfo: 'Decide how you want to use M&A',
        description:
          'Your team votes on 6 strategic dimensions using quick pairwise comparisons \u2014 growth objective, target profile, risk posture, integration approach, capability priority, and strategic proximity. Each vote is simply choosing between two options.',
        outputs: ['Force-ranked strategic priorities', 'Positioning on each spectrum', 'Team consensus baseline'],
        flowNote: 'Your strategic priorities inform Step 4.',
      },
      {
        num: 4,
        shortLabel: 'Markets',
        title: 'Market Segments and Product Categories',
        badge: 'Team Input',
        badgeColor: '#f97316',
        voteInfo: 'Prioritize and narrow down where you use M&A',
        description:
          'Based on your strategic priorities, Corp Dev Companion generates relevant market segments and product categories. Your team compares pairs to identify the most promising areas for acquisition. New adjacencies are injected real-time based on your voting.',
        outputs: ['Ranked market segments', 'Ranked product categories', 'Refined search parameters'],
        flowNote: 'Your top segments and categories feed into Step 5.',
      },
      {
        num: 5,
        shortLabel: 'Targets',
        title: 'Target Companies',
        badge: 'Team Input',
        badgeColor: '#f97316',
        voteInfo: 'Prioritize and rank the universe of relevant targets',
        description:
          'From your top segments and categories, Corp Dev Companion identifies specific acquisition targets. Your team compares companies head-to-head to build a ranked shortlist grounded in both strategic alignment and team consensus.',
        outputs: ['Ranked target companies', 'Head-to-head comparison data', 'Consensus-driven shortlist'],
        flowNote: 'Your ranked targets are aligned with the team prior to outreach.',
      },
    ],
  },
  {
    zoneLabel: 'SUMMARIZE AND SYNTHESIZE THE RESULT',
    color: '#22c55e',
    steps: [
      {
        num: 6,
        shortLabel: 'Brief',
        title: 'Strategic Brief',
        badge: 'Output',
        badgeColor: '#22c55e',
        description:
          'All votes are synthesized into a comprehensive strategic brief which is informed by your personalized starting point, team alignment, and proven M&A best practices. This is your M&A strategy \u2014 a north star to guide all deal discussions.',
        outputs: ['Force-ranked priorities', 'Aligned executive team', 'M&A "North Star"', 'Strategic narrative for deal discussions', 'M&A best practices'],
      },
    ],
  },
];

const PAIRWISE_BENEFITS = [
  { label: 'Fast', text: 'Each comparison takes a few seconds, not an hour long meeting' },
  { label: 'Intuitive', text: 'No complex scoring rubrics subject to individual bias' },
  { label: 'Rigorous', text: 'Proven model ("Bradley-Terry") produces statistically valid rankings from many votes' },
  { label: 'Collaborative', text: 'Multiple team members vote independently, results aggregate real-time' },
];

const CONFIDENCE_THRESHOLDS = [
  { votes: '25+ votes / 2 people', label: 'Directional' },
  { votes: '50+ votes / 3 people', label: 'Strong signal' },
  { votes: '100+ votes / 5 people', label: 'High confidence' },
];

// ── Background fetch status labels ──────────────────────────────────────

const FETCH_STAGES = [
  'Loading company profile...',
  'Analyzing financial statements...',
  'Fetching peer companies...',
  'Generating intelligence briefing...',
  'Ready to proceed',
];

// ── Component ───────────────────────────────────────────────────────────

export function HowItWorksPage() {
  const { state, dispatch } = useGameState();
  const [fetchStage, setFetchStage] = useState(0);
  const [fetchReady, setFetchReady] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const fetchStarted = useRef(false);

  // Kick off background fetches on mount
  const startBackgroundFetches = useCallback(async () => {
    if (fetchStarted.current) return;
    fetchStarted.current = true;

    const symbol = state.companyProfile?.symbol ?? 'HBB';

    try {
      // Stage 1: Analyze company
      setFetchStage(1);
      const data = await analyzeCompany(symbol);
      dispatch({ type: 'START_ANALYSIS', companyProfile: data.profile });

      // Stage 2: Fetch peers + start briefing in parallel
      setFetchStage(2);
      const briefingPromise = generateBriefing(data.promptData);
      const highlights = data.highlights ?? [];
      const revenueSegments = data.revenueSegments ?? [];
      const competitorProfiles = data.competitorProfiles ?? [];

      let peers: PeerCompany[] = [];
      try {
        peers = await fetchPeers(symbol, data.profile.sector, data.profile.industry);
      } catch {
        // Peer fetch failed, continue without peers
      }

      setFetchStage(3);

      if (peers.length > 0) {
        dispatch({ type: 'SET_AVAILABLE_PEERS', peers, promptData: data.promptData });

        // Wait for briefing in background
        briefingPromise.then((briefing) => {
          const allHighlights = [...highlights, ...(briefing.highlights ?? [])];
          dispatch({
            type: 'SET_STRATEGIC_IDEAS',
            ideas: briefing.ideas,
            highlights: allHighlights,
            revenueSegments,
            competitorProfiles,
            promptData: data.promptData,
          });
        }).catch((err) => {
          console.error('Background briefing generation failed:', err);
        });
      } else {
        const briefing = await briefingPromise;
        const allHighlights = [...highlights, ...(briefing.highlights ?? [])];
        dispatch({
          type: 'SET_STRATEGIC_IDEAS',
          ideas: briefing.ideas,
          highlights: allHighlights,
          revenueSegments,
          competitorProfiles,
          promptData: data.promptData,
        });
      }

      setFetchStage(4);
      setFetchReady(true);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to analyze company');
    }
  }, [state.companyProfile?.symbol, dispatch]);

  useEffect(() => {
    startBackgroundFetches();
  }, [startBackgroundFetches]);

  // Handle "Continue" -- if fetches are done, go to peer_selection or briefing.
  // If still loading, go to analyzing phase (shows the loading spinner).
  const handleContinue = () => {
    if (state.phase === 'peer_selection' || state.phase === 'briefing') {
      // Fetches already moved the phase forward -- just let it render
      return;
    }
    if (fetchReady) {
      // Fetches completed but phase hasn't moved yet -- force to peer_selection
      dispatch({ type: 'SET_PHASE', phase: 'peer_selection' });
    } else {
      // Still loading -- go to analyzing phase (shows loading spinner)
      dispatch({ type: 'SET_PHASE', phase: 'analyzing' });
    }
  };

  const sessionCode = (state as Record<string, unknown>).sessionId as string | undefined ?? 'AFBK3UCR';

  function handleCopyLink() {
    const url = `${window.location.origin}?session=${sessionCode}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* ── Page Header ── */}
        <div className="text-center mb-14">
          <p className="uppercase tracking-widest text-xs font-semibold text-[#f97316] mb-3">
            How It Works
          </p>
          <h1 className="text-4xl font-bold text-[#f1f5f9] mb-4 text-balance">
            Expert guidance and team alignment on your M&A strategy
          </h1>
          <p className="text-base text-[#cbd5e1] max-w-2xl mx-auto leading-relaxed text-pretty">
            Corp Dev Companion combines rigorous financial and market analysis with
            collaborative team input to produce a consensus-driven acquisition strategy.
            Here is the full process.
          </p>
        </div>

        {/* ── Zones ── */}
        <div className="flex flex-col gap-10 mb-14">
          {ZONES.map((zone) => (
            <div key={zone.zoneLabel}>
              {/* Zone label */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                <p className="uppercase tracking-widest text-xs font-semibold" style={{ color: zone.color }}>
                  {zone.zoneLabel}
                </p>
                <div className="flex-1 h-px" style={{ backgroundColor: `${zone.color}30` }} />
              </div>

              {/* Step cards */}
              <div className={`grid gap-4 ${
                zone.steps.length === 1 ? 'grid-cols-1' :
                zone.steps.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                'grid-cols-1 md:grid-cols-3'
              }`}>
                {zone.steps.map((step) => (
                  <div key={step.num} className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5 flex flex-col">
                    {/* Step header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: zone.color }}
                        >
                          {step.num}
                        </span>
                        <div>
                          <p className="text-base font-semibold text-[#f1f5f9]">{step.title}</p>
                          {'voteInfo' in step && step.voteInfo && (
                            <p className="text-xs text-[#94a3b8] mt-0.5">{step.voteInfo}</p>
                          )}
                        </div>
                      </div>
                      <span
                        className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0"
                        style={{ color: step.badgeColor, backgroundColor: `${step.badgeColor}18` }}
                      >
                        {step.badge}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[#94a3b8] leading-relaxed mb-3 flex-1">
                      {step.description}
                    </p>

                    {/* Outputs */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {step.outputs.map((o) => (
                        <span key={o} className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#0f1419] text-[#64748b] border border-[#2a3a4e]">
                          {o}
                        </span>
                      ))}
                    </div>

                    {/* Flow note */}
                    {'flowNote' in step && step.flowNote && (
                      <div className="mt-2 pt-2 border-t border-[#2a3a4e]">
                        <p className="text-[10px] text-[#f97316] italic flex items-start gap-1.5">
                          <span className="shrink-0 mt-px">{'\u2192'}</span>
                          {step.flowNote}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Pairwise Voting Explainer ── */}
        <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#3b82f6] shrink-0" />
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#3b82f6]">
              Why Pairwise Comparisons?
            </p>
          </div>
          <h2 className="text-lg font-bold text-[#e2e8f0] mb-2">Make the complex simple</h2>
          <p className="text-sm text-[#94a3b8] leading-relaxed mb-5">
            Instead of endless meetings, Powerpoints, and debates, M&A strategy is boiled
            down to something super simple: pick the better of two options... many times.
            Proven statistical models do the rest.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Benefits */}
            <div className="flex flex-col gap-3">
              {PAIRWISE_BENEFITS.map((b) => (
                <div key={b.label} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#3b82f6]/15 text-[#3b82f6] flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[#e2e8f0]">{b.label}</p>
                    <p className="text-[11px] text-[#94a3b8]">{b.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Example card */}
            <div className="bg-[#0f1419] border border-[#2a3a4e] rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-widest text-[#64748b] mb-3 text-center">
                Example comparison
              </p>
              <p className="text-[10px] text-[#64748b] text-center mb-3">Growth Objective</p>
              <div className="flex items-stretch gap-3">
                <div className="flex-1 bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-4 text-center">
                  <p className="text-xs font-semibold text-[#e2e8f0]">Market Share Consolidation</p>
                </div>
                <div className="flex items-center">
                  <span className="text-[10px] font-bold text-[#475569]">OR</span>
                </div>
                <div className="flex-1 bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-4 text-center">
                  <p className="text-xs font-semibold text-[#e2e8f0]">Category Extension</p>
                </div>
              </div>
              <p className="text-[10px] text-[#64748b] text-center mt-3 italic">
                Just tap the option that matters more to your M&A strategy
              </p>
            </div>
          </div>
        </div>

        {/* ── Invite Teammates ── */}
        <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#22c55e] shrink-0" />
            <p className="uppercase tracking-widest text-[10px] font-semibold text-[#22c55e]">
              Better Together
            </p>
          </div>
          <h2 className="text-lg font-bold text-[#e2e8f0] mb-2">Invite your team</h2>
          <p className="text-sm text-[#94a3b8] leading-relaxed mb-5">
            The more people who vote, the more reliable the consensus rankings become.
            Share the session code with colleagues so they can contribute their own
            comparisons. All votes are aggregated into a single consensus ranking.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Session code */}
            <div className="bg-[#0f1419] border border-[#2a3a4e] rounded-lg p-4 flex flex-col items-center justify-center">
              <p className="text-[10px] text-[#64748b] uppercase tracking-widest mb-2">Session Code</p>
              <p className="font-mono text-2xl font-bold text-[#e2e8f0] tracking-wider mb-3">{sessionCode}</p>
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-[#1a2332] border border-[#2a3a4e] rounded-lg text-xs font-medium text-[#94a3b8] hover:border-[#f97316] hover:text-[#f97316] transition-colors"
              >
                Copy invite link
              </button>
              <p className="text-[10px] text-[#475569] mt-2">Anyone with the code can join and vote</p>
            </div>

            {/* Confidence thresholds */}
            <div className="flex flex-col gap-2.5">
              <p className="text-[10px] text-[#64748b] uppercase tracking-widest mb-1">Vote Confidence</p>
              {CONFIDENCE_THRESHOLDS.map((t, i) => (
                <div key={t.votes} className="flex items-center gap-3">
                  <span className="font-mono text-[11px] font-bold text-[#e2e8f0] w-40 text-right shrink-0">{t.votes}</span>
                  <div className="flex-1 h-2 bg-[#0f1419] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(i + 1) * 33}%`,
                        backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#3b82f6' : '#22c55e',
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-[#94a3b8] w-28">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Background Fetch Status + CTA ── */}
        <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6 text-center">
          {/* Progress indicator */}
          {!fetchReady && !fetchError && (
            <div className="mb-5">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-4 h-4 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-[#94a3b8]">{FETCH_STAGES[fetchStage]}</p>
              </div>
              <div className="w-full max-w-xs mx-auto h-1 bg-[#0f1419] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#f97316] rounded-full transition-all duration-500"
                  style={{ width: `${((fetchStage + 1) / FETCH_STAGES.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {fetchReady && (
            <div className="flex items-center justify-center gap-2 mb-5">
              <svg className="w-5 h-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <p className="text-xs text-[#22c55e] font-medium">Analysis complete. Ready to proceed.</p>
            </div>
          )}

          {fetchError && (
            <div className="mb-5">
              <p className="text-xs text-red-400">{fetchError}</p>
              <button
                onClick={() => {
                  setFetchError(null);
                  fetchStarted.current = false;
                  startBackgroundFetches();
                }}
                className="mt-2 text-xs text-[#f97316] underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={!!fetchError}
            className="px-8 py-3 bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
          >
            {fetchReady ? 'Begin Step 3: Strategic Priorities' : 'Continue'}
          </button>
          <p className="text-[11px] text-[#64748b] mt-2">
            {fetchReady
              ? '6 dimensions, ~25 comparisons, ~5 minutes per person'
              : 'Analysis is running in the background. You can continue when ready.'}
          </p>
        </div>
      </div>
    </div>
  );
}
