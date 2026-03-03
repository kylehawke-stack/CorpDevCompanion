import { useState } from 'react';

/* ─── Step Data ─────────────────────────────────────────────────────── */
const STEPS = [
  {
    number: 1,
    title: 'Analyze',
    subtitle: 'Understand the starting point',
    description:
      'CorpDev Companion ingests financial statements, earnings calls, analyst coverage, and competitive data to build a complete picture of the company\u2019s M&A starting position\u200a\u2014\u200arevenue trajectory, margins, leverage, acquisition history, and available firepower.',
    outputs: ['Financial highlights', 'Revenue mix breakdown', 'Acquisition firepower estimate', 'Earnings call insights', 'Analyst perspectives'],
    color: '#f97316',
    phase: 'briefing',
  },
  {
    number: 2,
    title: 'Benchmark',
    subtitle: 'Compare against the peer set',
    description:
      'Selected competitors are benchmarked across every key metric\u200a\u2014\u200arevenue, margins, valuation, returns on capital, leverage, and acquisition firepower. This shows where the company leads, lags, and has room to grow through M&A.',
    outputs: ['Peer financial comparison', 'Relative valuation analysis', 'Competitive firepower ranking', 'Key takeaways'],
    color: '#3b82f6',
    phase: 'peer_benchmarking',
  },
  {
    number: 3,
    title: 'Align on Strategy',
    subtitle: 'Set the M&A direction',
    description:
      'Your team votes on 6 strategic dimensions using quick pairwise comparisons\u200a\u2014\u200agrowth objective, target profile, risk posture, integration approach, capability priority, and strategic proximity. Each vote is simply choosing between two options.',
    outputs: ['Force-ranked strategic priorities', 'Positioning on each spectrum', 'Team consensus baseline'],
    color: '#10b981',
    phase: 'voting_step1',
    isVoting: true,
    voteInfo: '~25 comparisons, ~2 min',
  },
  {
    number: 4,
    title: 'Prioritize Markets',
    subtitle: 'Narrow where to look',
    description:
      'Based on your strategic priorities, CorpDev Companion generates relevant market segments and product categories. Your team compares pairs to identify the most promising areas for acquisition\u200a\u2014\u200anarrowing a broad landscape into focused hunting grounds.',
    outputs: ['Ranked market segments', 'Ranked product categories', 'Refined search parameters'],
    color: '#8b5cf6',
    phase: 'voting_step2',
    isVoting: true,
    voteInfo: '~50 comparisons, ~5 min',
  },
  {
    number: 5,
    title: 'Identify Targets',
    subtitle: 'Build the shortlist',
    description:
      'From your top segments and categories, CorpDev Companion identifies specific acquisition targets. Your team compares companies head-to-head to build a ranked shortlist grounded in both strategic alignment and team consensus.',
    outputs: ['Ranked target companies', 'Head-to-head comparison data', 'Consensus-driven shortlist'],
    color: '#ec4899',
    phase: 'voting_step3',
    isVoting: true,
    voteInfo: 'Open-ended, add more anytime',
  },
  {
    number: 6,
    title: 'Strategic Brief',
    subtitle: 'The deliverable',
    description:
      'All votes are synthesized into a comprehensive strategic brief\u200a\u2014\u200aforce-ranked priorities, market focus areas, and target companies, informed by external M&A best practices. This is the artifact your team takes into deal discussions.',
    outputs: ['Force-ranked results across all tiers', 'Strategic narrative', 'M&A best practices alignment'],
    color: '#f97316',
    phase: 'results',
  },
];

/* ─── Component ─────────────────────────────────────────────────────── */
export function HowItWorksMockup() {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0f1419]">
      {/* Header */}
      <header className="bg-[#1a2332] border-b border-[#2a3a4e] px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-lg font-semibold text-white">CorpDev Companion</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-balance">
            From financial analysis to M&A shortlist in six steps
          </h2>
          <p className="text-[#94a3b8] max-w-2xl mx-auto text-balance leading-relaxed">
            CorpDev Companion combines rigorous financial analysis with collaborative team input
            to produce a consensus-driven acquisition strategy. Here is the full process.
          </p>
        </div>

        {/* Visual Journey - Connected Steps */}
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute left-6 md:left-8 top-0 bottom-0 w-px"
            style={{ background: 'linear-gradient(to bottom, #f97316, #3b82f6, #10b981, #8b5cf6, #ec4899, #f97316)' }}
          />

          <div className="flex flex-col gap-4">
            {STEPS.map((step, i) => {
              const isExpanded = expandedStep === i;
              const isSystemStep = !step.isVoting;

              return (
                <div key={step.number} className="relative pl-16 md:pl-20">
                  {/* Step number circle */}
                  <div
                    className="absolute left-0 top-4 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 z-10"
                    style={{
                      borderColor: step.color,
                      backgroundColor: '#0f1419',
                    }}
                  >
                    <span
                      className="font-mono text-lg md:text-xl font-bold"
                      style={{ color: step.color }}
                    >
                      {step.number}
                    </span>
                  </div>

                  {/* Card */}
                  <button
                    className="w-full text-left bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5 md:p-6 transition-all hover:border-[#3a4a5e] cursor-pointer"
                    style={isExpanded ? { borderColor: step.color + '60' } : undefined}
                    onClick={() => setExpandedStep(isExpanded ? null : i)}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold text-white">{step.title}</h3>

                          {/* Badge */}
                          {isSystemStep ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-[#2a3a4e] text-[#94a3b8]">
                              System
                            </span>
                          ) : (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                              style={{ backgroundColor: step.color + '20', color: step.color }}
                            >
                              Team Input
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#94a3b8]">{step.subtitle}</p>
                      </div>

                      {/* Vote info or expand arrow */}
                      <div className="flex items-center gap-3 shrink-0">
                        {step.voteInfo && (
                          <span className="text-[10px] font-mono text-[#64748b]">{step.voteInfo}</span>
                        )}
                        <svg
                          className={`w-5 h-5 text-[#64748b] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[#2a3a4e]">
                        <p className="text-sm text-[#94a3b8] leading-relaxed mb-4">
                          {step.description}
                        </p>

                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-[#64748b] font-semibold mb-2">
                            Outputs
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {step.outputs.map((output) => (
                              <span
                                key={output}
                                className="px-2.5 py-1 rounded-md text-xs border"
                                style={{
                                  borderColor: step.color + '30',
                                  color: step.color,
                                  backgroundColor: step.color + '08',
                                }}
                              >
                                {output}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Flow arrow for voting steps */}
                        {step.isVoting && (
                          <div className="mt-4 pt-3 border-t border-[#2a3a4e]">
                            <p className="text-[10px] text-[#475569] italic">
                              {step.number === 3
                                ? 'Your strategic priorities feed directly into Step 4 to generate relevant market segments.'
                                : step.number === 4
                                  ? 'Your top segments and categories feed into Step 5 to identify specific companies.'
                                  : 'Your ranked targets become the foundation of the final strategic brief.'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </button>

                  {/* Connector arrow between steps */}
                  {i < STEPS.length - 1 && (
                    <div className="flex items-center gap-2 py-1 pl-1">
                      <svg className="w-3 h-3 text-[#2a3a4e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pairwise Voting Explainer */}
        <div className="mt-16 bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-2">
                Why pairwise comparisons?
              </p>
              <h3 className="text-xl font-bold text-white mb-4">
                Making the complex simple
              </h3>
              <p className="text-sm text-[#94a3b8] leading-relaxed mb-4">
                Instead of asking people to rank a long list (which is slow and cognitively exhausting),
                we show two options at a time. Just pick the one you think matters more. That is it.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Fast', detail: 'Each comparison takes a few seconds, not minutes' },
                  { label: 'Intuitive', detail: 'No complex scoring rubrics or forced ranking' },
                  { label: 'Rigorous', detail: 'Bradley-Terry model produces statistically valid rankings from simple inputs' },
                  { label: 'Collaborative', detail: 'Multiple team members vote independently, results aggregate automatically' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#f97316] mt-1.5 shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-white">{item.label}</span>
                      <span className="text-sm text-[#64748b]"> {'\u2014'} {item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual example of a pairwise comparison */}
            <div className="bg-[#0f1419] border border-[#2a3a4e] rounded-xl p-6">
              <p className="text-[10px] uppercase tracking-widest text-[#64748b] font-semibold mb-4 text-center">
                Example comparison
              </p>
              <div className="flex gap-3">
                <div className="flex-1 bg-[#1a2332] border border-[#2a3a4e] rounded-lg p-4 text-center hover:border-[#f97316] transition-colors cursor-pointer">
                  <p className="text-xs text-[#64748b] mb-1">Option A</p>
                  <p className="text-sm font-semibold text-white">Market Share Consolidation</p>
                  <p className="text-[10px] text-[#475569] mt-1">Growth Objective</p>
                </div>
                <div className="flex items-center">
                  <span className="text-xs font-bold text-[#475569]">vs</span>
                </div>
                <div className="flex-1 bg-[#1a2332] border border-[#f97316] rounded-lg p-4 text-center cursor-pointer">
                  <p className="text-xs text-[#64748b] mb-1">Option B</p>
                  <p className="text-sm font-semibold text-[#f97316]">Category Extension</p>
                  <p className="text-[10px] text-[#475569] mt-1">Growth Objective</p>
                </div>
              </div>
              <p className="text-[10px] text-[#475569] text-center mt-3 italic">
                Just tap the option that matters more to your M&A strategy
              </p>
            </div>
          </div>
        </div>

        {/* Invite teammates */}
        <div className="mt-8 bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-2">
                Better together
              </p>
              <h3 className="text-xl font-bold text-white mb-3">
                Invite your team
              </h3>
              <p className="text-sm text-[#94a3b8] leading-relaxed mb-4">
                The more people who vote, the more reliable the consensus rankings become.
                Share the session code with colleagues so they can contribute their own comparisons.
                All votes are aggregated into a single consensus ranking.
              </p>

              {/* Confidence thresholds */}
              <div className="flex flex-col gap-2">
                {[
                  { label: '25+ votes', level: 'Directional', pct: 25, color: '#f59e0b' },
                  { label: '50+ votes', level: 'Strong signal', pct: 55, color: '#10b981' },
                  { label: '100+ votes', level: 'High confidence', pct: 100, color: '#3b82f6' },
                ].map((tier) => (
                  <div key={tier.label} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[#94a3b8] w-20 shrink-0">{tier.label}</span>
                    <div className="flex-1 h-2 bg-[#0f1419] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${tier.pct}%`, backgroundColor: tier.color }}
                      />
                    </div>
                    <span className="text-xs text-[#64748b] w-24 shrink-0 text-right">{tier.level}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="bg-[#0f1419] border border-[#2a3a4e] rounded-lg px-8 py-4 text-center">
                <p className="text-[10px] text-[#475569] mb-1">Session Code</p>
                <p className="font-mono text-3xl font-bold text-[#f97316] tracking-wider">AFBK3UCR</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#2a3a4e] text-[#e2e8f0] rounded-lg text-sm hover:bg-[#3a4a5e] transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy invite link
              </button>
              <p className="text-[10px] text-[#475569] text-center">
                Anyone with the code can join and vote
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <button className="px-8 py-3 bg-[#f97316] text-white font-semibold rounded-lg hover:bg-[#ea580c] transition-colors text-base">
            Begin Step 3: Strategic Priorities
          </button>
          <p className="text-xs text-[#475569] mt-2">6 dimensions, ~25 comparisons, ~2 minutes</p>
        </div>
      </main>
    </div>
  );
}
