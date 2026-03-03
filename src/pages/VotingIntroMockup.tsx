import { useState } from 'react';

// ─── Full Journey Overview + Voting Introduction ────────────────────
// Shows the complete 6-step process with steps 1-2 marked complete,
// steps 3-5 as the upcoming voting funnel, and step 6 as the destination.

const JOURNEY_STEPS = [
  {
    number: 1,
    title: 'Company Analysis',
    subtitle: 'Completed',
    description: 'Financial history, acquisitiveness, firepower, earnings call insights, and competitive positioning.',
    completed: true,
    color: '#10b981',
  },
  {
    number: 2,
    title: 'Peer Benchmarking',
    subtitle: 'Completed',
    description: 'Head-to-head comparison against selected competitors across all key financial and valuation metrics.',
    completed: true,
    color: '#10b981',
  },
];

const VOTING_STEPS = [
  {
    number: 3,
    title: 'Strategic Priorities',
    subtitle: '6 dimensions, ~25 votes',
    description: 'Align the team on what matters most for M&A. You\'ll compare pairs of strategic dimensions -- like Growth Objective vs. Risk Posture -- to force-rank your priorities and position on each spectrum.',
    examples: ['Growth Objective', 'Target Profile', 'Risk Posture', 'Integration', 'Capability Priority', 'Strategic Proximity'],
    color: '#f97316',
    outputLabel: 'Produces',
    outputs: 'Ranked priorities + spectrum positioning on each dimension',
    funnelPct: 100,
  },
  {
    number: 4,
    title: 'Market Segments & Categories',
    subtitle: 'Generated from Step 3, ~50 votes',
    description: 'Based on your strategic priorities, CorpDev Companion generates relevant market segments and product categories to explore. Compare pairs to identify where to hunt for targets.',
    examples: ['Smart Home Appliances', 'Commercial Kitchen Equipment', 'DTC Health & Wellness', 'Pet Care Technology'],
    color: '#3b82f6',
    outputLabel: 'Produces',
    outputs: 'Ranked market segments and product categories aligned with strategy',
    funnelPct: 60,
  },
  {
    number: 5,
    title: 'Target Companies',
    subtitle: 'Generated from Step 4, open-ended',
    description: 'From your top segments and categories, CorpDev Companion identifies specific acquisition candidates. Compare companies head-to-head to build a force-ranked shortlist.',
    examples: ['Traeger Inc.', 'iRobot Corp.', 'Lovesac Company', 'Breville Group'],
    color: '#8b5cf6',
    outputLabel: 'Produces',
    outputs: 'A ranked acquisition target list ready for deep-dive diligence',
    funnelPct: 30,
  },
];

export function VotingIntroMockup() {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = window.location.origin + window.location.pathname;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      {/* Header */}
      <header className="border-b border-[#2a3a4e] px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#e2e8f0]">CorpDev Companion</h1>
            <p className="text-xs text-[#64748b]">Hamilton Beach Brands Holding Company</p>
          </div>
          <a href="#" className="text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors">
            Back to Briefing
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">

        {/* ── Hero ── */}
        <div className="text-center mb-14">
          <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">
            Your M&A Process
          </p>
          <h2 className="text-4xl font-bold text-[#e2e8f0] mb-4 text-balance">
            From analysis to acquisition targets in six steps
          </h2>
          <p className="text-[#94a3b8] max-w-2xl mx-auto leading-relaxed">
            CorpDev Companion guides your team from understanding the company's starting position to a ranked list of acquisition targets, with collaborative voting at each decision point.
          </p>
        </div>

        {/* ── Completed Steps (horizontal, compact) ── */}
        <div className="flex items-stretch gap-4 mb-3">
          {JOURNEY_STEPS.map(step => (
            <div
              key={step.number}
              className="flex-1 bg-[#1a2332]/60 border border-[#10b981]/20 rounded-xl px-5 py-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-[#10b981]/15 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9.5L7.5 13L14 5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#10b981] font-bold">STEP {step.number}</span>
                  <span className="text-[10px] font-mono text-[#10b981]/60">Complete</span>
                </div>
                <p className="text-sm font-semibold text-[#e2e8f0]">{step.title}</p>
                <p className="text-[11px] text-[#64748b] leading-snug mt-0.5 truncate">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Connector: completed to upcoming ── */}
        <div className="flex justify-center my-1">
          <div className="flex flex-col items-center">
            <div className="w-px h-5 bg-[#2a3a4e]" />
            <svg width="14" height="8" viewBox="0 0 14 8"><polygon points="7 8, 0 0, 14 0" fill="#2a3a4e" /></svg>
          </div>
        </div>

        {/* ── Section Label ── */}
        <div className="text-center mb-6 mt-2">
          <p className="text-xs text-[#64748b]">Now it's your turn</p>
          <h3 className="text-xl font-bold text-[#e2e8f0]">Collaborative Voting</h3>
        </div>

        {/* ── Voting Funnel (3 steps, connected) ── */}
        <div className="relative mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 relative z-10">
            {VOTING_STEPS.map((step, i) => (
              <div key={step.number} className="relative flex flex-col">
                {/* Mobile connector */}
                {i > 0 && (
                  <div className="lg:hidden flex flex-col items-center -mt-2 mb-2">
                    <div className="w-px h-4 bg-[#2a3a4e]" />
                    <p className="text-[9px] italic text-[#475569] my-0.5">feeds into</p>
                    <svg width="12" height="8" viewBox="0 0 12 8"><polygon points="6 8, 0 0, 12 0" fill="#2a3a4e" /></svg>
                  </div>
                )}

                <div
                  className="bg-[#1a2332] border rounded-xl p-6 flex-1 flex flex-col relative overflow-hidden"
                  style={{ borderColor: step.color + '30' }}
                >
                  {/* Funnel background bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0f1419]">
                    <div
                      className="h-full rounded-r-full"
                      style={{ width: `${step.funnelPct}%`, backgroundColor: step.color, opacity: 0.3 }}
                    />
                  </div>

                  {/* Step badge + title */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shrink-0"
                      style={{ backgroundColor: step.color + '18', color: step.color }}
                    >
                      {step.number}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[#e2e8f0] leading-tight">{step.title}</h4>
                      <p className="text-[10px] font-mono text-[#64748b]">{step.subtitle}</p>
                    </div>
                  </div>

                  <p className="text-sm text-[#94a3b8] leading-relaxed mb-4 flex-1">{step.description}</p>

                  {/* Example chips */}
                  <div className="mb-4">
                    <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-2">Example options</p>
                    <div className="flex flex-wrap gap-1.5">
                      {step.examples.map(ex => (
                        <span
                          key={ex}
                          className="text-[10px] px-2 py-1 rounded-md font-medium"
                          style={{ backgroundColor: step.color + '12', color: step.color }}
                        >
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Output */}
                  <div className="pt-3 border-t border-[#2a3a4e]">
                    <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-1">{step.outputLabel}</p>
                    <p className="text-xs text-[#64748b]">{step.outputs}</p>
                  </div>
                </div>

                {/* Desktop "feeds into" arrow */}
                {i < VOTING_STEPS.length - 1 && (
                  <div className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20 flex-col items-center">
                    <svg width="10" height="20" viewBox="0 0 10 20"><polygon points="10 10, 0 0, 0 20" fill="#2a3a4e" /></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Connector to Results ── */}
        <div className="flex justify-center mt-1 mb-3">
          <div className="flex flex-col items-center">
            <div className="w-px h-5 bg-[#2a3a4e]" />
            <svg width="14" height="8" viewBox="0 0 14 8"><polygon points="7 8, 0 0, 14 0" fill="#2a3a4e" /></svg>
          </div>
        </div>

        {/* ── Step 6: Results (destination) ── */}
        <div className="bg-[#1a2332] border border-[#f97316]/20 rounded-xl px-6 py-4 flex items-center gap-4 mb-14 max-w-xl mx-auto">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shrink-0"
            style={{ backgroundColor: '#f9731618', color: '#f97316' }}
          >
            6
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#f97316] font-bold">DESTINATION</span>
            </div>
            <p className="text-sm font-semibold text-[#e2e8f0]">Force-Ranked Results</p>
            <p className="text-[11px] text-[#64748b] leading-snug mt-0.5">
              Strategic priorities, market segments, and acquisition targets -- ranked by team consensus.
            </p>
          </div>
        </div>

        {/* ── How Pairwise Voting Works ── */}
        <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-8 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">
                How it works
              </p>
              <h3 className="text-xl font-bold text-[#e2e8f0] mb-4">
                Pairwise comparison voting
              </h3>
              <p className="text-sm text-[#94a3b8] leading-relaxed mb-5">
                Instead of ranking a long list or scoring items 1-10, you make simple A-vs-B choices. Each vote is a single question: <span className="text-[#e2e8f0] font-medium">{"\"Which matters more?\""}</span>
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Fast', text: 'Each comparison takes 2-3 seconds. No overthinking.' },
                  { label: 'Intuitive', text: 'Binary choices tap into gut instinct, which is often more reliable for strategic decisions.' },
                  { label: 'Rigorous', text: 'A statistical model converts pairwise choices into a mathematically robust ranking.' },
                  { label: 'Collaborative', text: 'Multiple team members vote simultaneously. The model aggregates everyone\'s input into consensus.' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#f97316] mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#e2e8f0]">{item.label}</p>
                      <p className="text-xs text-[#64748b]">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Example comparison card */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-xs">
                <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-3 text-center">Example comparison</p>
                <div className="flex flex-col gap-3">
                  <div className="bg-[#0f1419] border border-[#f97316]/30 rounded-lg p-4 text-center hover:border-[#f97316]/60 transition-colors">
                    <p className="text-[10px] uppercase tracking-widest text-[#f97316] mb-1">Option A</p>
                    <p className="text-sm font-bold text-[#e2e8f0]">Growth Objective</p>
                    <p className="text-[10px] text-[#64748b] mt-1">Revenue expansion through new markets</p>
                  </div>
                  <div className="text-center">
                    <span className="text-base font-bold text-[#475569]">vs</span>
                  </div>
                  <div className="bg-[#0f1419] border border-[#2a3a4e] rounded-lg p-4 text-center hover:border-[#f97316]/60 transition-colors">
                    <p className="text-[10px] uppercase tracking-widest text-[#3b82f6] mb-1">Option B</p>
                    <p className="text-sm font-bold text-[#e2e8f0]">Risk Posture</p>
                    <p className="text-[10px] text-[#64748b] mt-1">How aggressive should the M&A strategy be</p>
                  </div>
                </div>
                <p className="text-[10px] text-[#475569] text-center mt-3 italic">
                  Click a card or press A / L to vote
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Invite Teammates ── */}
        <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-8 mb-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-2">
                Better together
              </p>
              <h3 className="text-xl font-bold text-[#e2e8f0] mb-2">
                Invite your team
              </h3>
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                The more votes, the more reliable the rankings. Share the session code with colleagues so they can contribute their own comparisons. All votes are aggregated to produce a single consensus ranking.
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-center gap-3">
              <div className="bg-[#0f1419] border border-[#2a3a4e] rounded-lg px-6 py-3 text-center">
                <p className="text-[10px] text-[#475569] mb-1">Session Code</p>
                <p className="font-mono text-2xl font-bold text-[#f97316] tracking-wider">AFBK3UCR</p>
              </div>
              <button
                onClick={handleCopyLink}
                className="text-xs text-[#94a3b8] hover:text-[#f97316] border border-[#2a3a4e] hover:border-[#f97316]/40 rounded-lg px-4 py-2 transition-colors w-full text-center"
              >
                {copied ? 'Copied!' : 'Copy session link'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Vote Confidence Tiers ── */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          {[
            { threshold: '25+', label: 'Good baseline', desc: 'Minimum for reliable rankings per step', barPct: 33 },
            { threshold: '50+', label: 'Strong signal', desc: 'Clear patterns emerge with higher confidence', barPct: 66 },
            { threshold: '100+', label: 'High confidence', desc: 'Robust consensus across the team', barPct: 100 },
          ].map(tier => (
            <div key={tier.threshold} className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-4 text-center">
              <p className="font-mono text-2xl font-bold text-[#f97316]">{tier.threshold}</p>
              <p className="text-xs font-semibold text-[#e2e8f0] mt-1">{tier.label}</p>
              <div className="w-full h-1 bg-[#0f1419] rounded-full mt-2 mb-2">
                <div className="h-full bg-[#f97316] rounded-full" style={{ width: `${tier.barPct}%`, opacity: 0.6 }} />
              </div>
              <p className="text-[10px] text-[#64748b]">{tier.desc}</p>
            </div>
          ))}
        </div>

        {/* ── CTA ── */}
        <div className="text-center">
          <button className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-8 py-3 rounded-lg text-base transition-colors">
            Begin Voting
          </button>
          <p className="text-[10px] text-[#475569] mt-3">
            {'Step 3 starts with 6 strategic priority dimensions \u00B7 ~25 votes \u00B7 takes about 2 minutes'}
          </p>
        </div>

      </main>
    </div>
  );
}
