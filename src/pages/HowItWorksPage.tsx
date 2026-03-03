import { useGameState } from '../context/GameStateContext.tsx';

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
          "CorpDev Companion ingests financial statements, earnings calls, analyst coverage, and competitive data to build a complete picture of the company\u2019s M&A starting position \u2014 revenue trajectory, margins, leverage, acquisition history, and available firepower.",
        outputs: [
          'Financial highlights',
          'Revenue mix breakdown',
          'Acquisition firepower estimate',
          'Earnings call insights',
          'Analyst perspectives',
        ],
      },
      {
        num: 2,
        shortLabel: 'Benchmark',
        title: 'Peer Benchmarking',
        badge: 'System',
        badgeColor: '#64748b',
        description:
          'Selected competitors are benchmarked across every key metric \u2014 revenue, margins, valuation, returns on capital, leverage, and acquisition firepower. This shows where the company leads, lags, and has room to grow through M&A.',
        outputs: [
          'Peer financial comparison',
          'Relative valuation analysis',
          'Competitive firepower ranking',
          'Key takeaways',
        ],
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
        voteInfo: '~25 comparisons, ~2 min',
        description:
          'Your team votes on 6 strategic dimensions using quick pairwise comparisons \u2014 growth objective, target profile, risk posture, integration approach, capability priority, and strategic proximity. Each vote is simply choosing between two options.',
        outputs: [
          'Force-ranked strategic priorities',
          'Positioning on each spectrum',
          'Team consensus baseline',
        ],
        flowNote:
          'Your strategic priorities feed directly into Step 4 to generate relevant market segments.',
      },
      {
        num: 4,
        shortLabel: 'Markets',
        title: 'Market Segments',
        badge: 'Team Input',
        badgeColor: '#f97316',
        voteInfo: '~50 comparisons, ~5 min',
        description:
          'Based on your strategic priorities, CorpDev Companion generates relevant market segments and product categories. Your team compares pairs to identify the most promising areas for acquisition \u2014 narrowing a broad landscape into focused hunting grounds.',
        outputs: [
          'Ranked market segments',
          'Ranked product categories',
          'Refined search parameters',
        ],
        flowNote:
          'Your top segments and categories feed into Step 5 to identify specific companies.',
      },
      {
        num: 5,
        shortLabel: 'Targets',
        title: 'Target Companies',
        badge: 'Team Input',
        badgeColor: '#f97316',
        voteInfo: 'Open-ended, add more anytime',
        description:
          'From your top segments and categories, CorpDev Companion identifies specific acquisition targets. Your team compares companies head-to-head to build a ranked shortlist grounded in both strategic alignment and team consensus.',
        outputs: [
          'Ranked target companies',
          'Head-to-head comparison data',
          'Consensus-driven shortlist',
        ],
        flowNote:
          'Your ranked targets become the foundation of the final strategic brief.',
      },
    ],
  },
  {
    zoneLabel: 'THE DELIVERABLE',
    color: '#22c55e',
    steps: [
      {
        num: 6,
        shortLabel: 'Brief',
        title: 'Strategic Brief',
        badge: 'Output',
        badgeColor: '#22c55e',
        description:
          'All votes are synthesized into a comprehensive strategic brief \u2014 force-ranked priorities, market focus areas, and target companies, informed by external M&A best practices. This is the artifact your team takes into deal discussions.',
        outputs: [
          'Force-ranked results across all tiers',
          'Strategic narrative',
          'M&A best practices alignment',
        ],
      },
    ],
  },
];

const PAIRWISE_BENEFITS = [
  { label: 'Fast', text: 'Each comparison takes a few seconds, not minutes' },
  { label: 'Intuitive', text: 'No complex scoring rubrics or forced ranking' },
  {
    label: 'Rigorous',
    text: 'Bradley-Terry model produces statistically valid rankings from simple inputs',
  },
  {
    label: 'Collaborative',
    text: 'Multiple team members vote independently, results aggregate automatically',
  },
];

const CONFIDENCE_THRESHOLDS = [
  { votes: '25+', label: 'Directional' },
  { votes: '50+', label: 'Strong signal' },
  { votes: '100+', label: 'High confidence' },
];

export function HowItWorksPage({ onBegin }: { onBegin?: () => void }) {
  const { state } = useGameState();
  const sessionCode = state.sessionId ?? 'AFBK3UCR';

  function handleCopyLink() {
    const url = `${window.location.origin}?session=${sessionCode}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* ── Page Header ── */}
        <div className="text-center mb-14">
          <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">
            How It Works
          </p>
          <h1 className="text-3xl font-bold text-[#f1f5f9] mb-3 text-balance">
            From financial analysis to M&A shortlist in six steps
          </h1>
          <p className="text-sm text-[#94a3b8] max-w-2xl mx-auto leading-relaxed text-pretty">
            CorpDev Companion combines rigorous financial analysis with collaborative
            team input to produce a consensus-driven acquisition strategy. Here is the
            full process.
          </p>
        </div>

        {/* ── Zones ── */}
        <div className="flex flex-col gap-10 mb-14">
          {ZONES.map((zone) => (
            <div key={zone.zoneLabel}>
              {/* Zone label */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: zone.color }}
                />
                <p
                  className="uppercase tracking-widest text-[10px] font-semibold"
                  style={{ color: zone.color }}
                >
                  {zone.zoneLabel}
                </p>
                <div className="flex-1 h-px" style={{ backgroundColor: `${zone.color}30` }} />
              </div>

              {/* Step cards */}
              <div
                className={`grid gap-4 ${
                  zone.steps.length === 1
                    ? 'grid-cols-1'
                    : zone.steps.length === 2
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-3'
                }`}
              >
                {zone.steps.map((step, si) => (
                  <div
                    key={step.num}
                    className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5 flex flex-col"
                  >
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
                          <p className="text-sm font-semibold text-[#e2e8f0]">{step.title}</p>
                          {'voteInfo' in step && step.voteInfo && (
                            <p className="text-[10px] text-[#64748b] mt-0.5">{step.voteInfo}</p>
                          )}
                        </div>
                      </div>
                      <span
                        className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          color: step.badgeColor,
                          backgroundColor: `${step.badgeColor}18`,
                        }}
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
                        <span
                          key={o}
                          className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#0f1419] text-[#64748b] border border-[#2a3a4e]"
                        >
                          {o}
                        </span>
                      ))}
                    </div>

                    {/* Flow note (arrow to next step) */}
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
          <h2 className="text-lg font-bold text-[#e2e8f0] mb-2">Making the complex simple</h2>
          <p className="text-sm text-[#94a3b8] leading-relaxed mb-5">
            Instead of asking people to rank a long list (which is slow and cognitively
            exhausting), we show two options at a time. Just pick the one you think matters
            more. That is it.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Benefits */}
            <div className="flex flex-col gap-3">
              {PAIRWISE_BENEFITS.map((b) => (
                <div key={b.label} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#3b82f6]/15 text-[#3b82f6] flex items-center justify-center shrink-0 mt-0.5">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
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
                <button className="flex-1 bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-4 text-center hover:border-[#f97316] transition-colors">
                  <p className="text-xs font-semibold text-[#e2e8f0]">
                    Market Share Consolidation
                  </p>
                </button>
                <div className="flex items-center">
                  <span className="text-[10px] font-bold text-[#475569]">OR</span>
                </div>
                <button className="flex-1 bg-[#1a2332] border border-[#2a3a4e] rounded-lg px-3 py-4 text-center hover:border-[#f97316] transition-colors">
                  <p className="text-xs font-semibold text-[#e2e8f0]">Category Extension</p>
                </button>
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
            {/* Session code + copy */}
            <div className="bg-[#0f1419] border border-[#2a3a4e] rounded-lg p-4 flex flex-col items-center justify-center">
              <p className="text-[10px] text-[#64748b] uppercase tracking-widest mb-2">
                Session Code
              </p>
              <p className="font-mono text-2xl font-bold text-[#e2e8f0] tracking-wider mb-3">
                {sessionCode}
              </p>
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-[#1a2332] border border-[#2a3a4e] rounded-lg text-xs font-medium text-[#94a3b8] hover:border-[#f97316] hover:text-[#f97316] transition-colors"
              >
                Copy invite link
              </button>
              <p className="text-[10px] text-[#475569] mt-2">
                Anyone with the code can join and vote
              </p>
            </div>

            {/* Confidence thresholds */}
            <div className="flex flex-col gap-2.5">
              <p className="text-[10px] text-[#64748b] uppercase tracking-widest mb-1">
                Vote Confidence
              </p>
              {CONFIDENCE_THRESHOLDS.map((t, i) => (
                <div key={t.votes} className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-[#e2e8f0] w-12 text-right">
                    {t.votes}
                  </span>
                  <div className="flex-1 h-2 bg-[#0f1419] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(i + 1) * 33}%`,
                        backgroundColor:
                          i === 0 ? '#f59e0b' : i === 1 ? '#3b82f6' : '#22c55e',
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-[#94a3b8] w-28">{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="text-center">
          <button
            onClick={onBegin}
            className="px-8 py-3 bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Begin Step 3: Strategic Priorities
          </button>
          <p className="text-[11px] text-[#64748b] mt-2">
            6 dimensions, ~25 comparisons, ~2 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
