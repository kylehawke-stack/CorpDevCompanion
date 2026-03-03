import { useState } from 'react';

// ─── Voting Process Introduction Page Mockup ────────────────────────
// Sits between Peer Benchmarking and the first voting step.
// Visually explains the 3-step funnel, pairwise voting, and collaboration.

const STEPS = [
  {
    number: 1,
    title: 'Strategic Priorities',
    subtitle: '6 dimensions, ~25 votes',
    description: 'Define what matters most for your M&A strategy. You\'ll compare pairs of strategic dimensions -- like Growth Objective vs. Risk Posture -- to force-rank what the team values.',
    examples: ['Growth Objective', 'Target Profile', 'Risk Posture', 'Integration', 'Capability Priority', 'Strategic Proximity'],
    color: '#f97316',
    outputLabel: 'Outputs',
    outputs: 'Ranked strategic priorities + positioning on each spectrum (conservative to aggressive)',
  },
  {
    number: 2,
    title: 'Market Segments & Categories',
    subtitle: 'AI-generated, ~50 votes',
    description: 'Based on your strategic priorities, AI generates relevant market segments and product categories to explore. Compare pairs to identify where to hunt.',
    examples: ['Smart Home Appliances', 'Commercial Kitchen Equipment', 'DTC Health & Wellness', 'Pet Care Technology'],
    color: '#3b82f6',
    outputLabel: 'Outputs',
    outputs: 'Ranked segments and categories that align with your strategic direction',
  },
  {
    number: 3,
    title: 'Specific Companies',
    subtitle: 'AI-generated, open-ended',
    description: 'From your top segments and categories, AI identifies specific acquisition targets. Compare companies head-to-head to build a ranked shortlist.',
    examples: ['Traeger Inc.', 'iRobot Corp.', 'Lovesac Company', 'Breville Group'],
    color: '#10b981',
    outputLabel: 'Outputs',
    outputs: 'A force-ranked acquisition target list ready for deep-dive diligence',
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
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[#e2e8f0]">CorpDev Companion</h1>
            <p className="text-xs text-[#64748b]">Hamilton Beach Brands Holding Company</p>
          </div>
          <a href="#" className="text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors">
            {'Back to Briefing'}
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* ── Hero Section ── */}
        <div className="text-center mb-16">
          <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">
            Next: Collaborative Voting
          </p>
          <h2 className="text-4xl font-bold text-[#e2e8f0] mb-4 text-balance">
            Build your M&A strategy in three steps
          </h2>
          <p className="text-[#94a3b8] max-w-2xl mx-auto leading-relaxed">
            Through pairwise comparisons, your team will systematically narrow from broad strategy down to specific acquisition targets. Each step feeds the next.
          </p>
        </div>

        {/* ── Funnel Visualization ── */}
        <div className="relative mb-16">
          {/* Connection lines */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 -translate-y-1/2 z-0">
            <svg className="w-full h-24" viewBox="0 0 1000 100" preserveAspectRatio="none">
              {/* Arrow from Step 1 to Step 2 */}
              <path d="M 320 50 L 370 50" stroke="#2a3a4e" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
              {/* Arrow from Step 2 to Step 3 */}
              <path d="M 655 50 L 705 50" stroke="#2a3a4e" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
              {/* "informs" labels */}
              <text x="345" y="38" fill="#475569" fontSize="10" textAnchor="middle" fontStyle="italic">informs</text>
              <text x="680" y="38" fill="#475569" fontSize="10" textAnchor="middle" fontStyle="italic">informs</text>
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#2a3a4e" />
                </marker>
              </defs>
            </svg>
          </div>

          {/* Step Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
            {STEPS.map((step, i) => (
              <div key={step.number} className="relative">
                {/* Mobile "informs" connector */}
                {i > 0 && (
                  <div className="lg:hidden flex flex-col items-center -mt-3 mb-3">
                    <div className="w-px h-4 bg-[#2a3a4e]" />
                    <p className="text-[10px] italic text-[#475569] my-1">informs</p>
                    <svg width="12" height="8" viewBox="0 0 12 8">
                      <polygon points="6 8, 0 0, 12 0" fill="#2a3a4e" />
                    </svg>
                  </div>
                )}

                <div
                  className="bg-[#1a2332] border rounded-xl p-6 h-full flex flex-col"
                  style={{ borderColor: step.color + '40' }}
                >
                  {/* Step number + funnel size indicator */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: step.color + '20', color: step.color }}
                    >
                      {step.number}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-[#e2e8f0]">{step.title}</h3>
                      <p className="text-[10px] font-mono text-[#64748b]">{step.subtitle}</p>
                    </div>
                  </div>

                  {/* Funnel width visual */}
                  <div className="mb-4">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: step.number === 1 ? '100%' : step.number === 2 ? '66%' : '33%',
                        backgroundColor: step.color,
                        opacity: 0.6,
                      }}
                    />
                  </div>

                  <p className="text-sm text-[#94a3b8] leading-relaxed mb-4 flex-1">
                    {step.description}
                  </p>

                  {/* Example chips */}
                  <div className="mb-4">
                    <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-2">Example options</p>
                    <div className="flex flex-wrap gap-1.5">
                      {step.examples.map(ex => (
                        <span
                          key={ex}
                          className="text-[10px] px-2 py-1 rounded-md font-medium"
                          style={{ backgroundColor: step.color + '15', color: step.color }}
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
              </div>
            ))}
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
              <p className="text-sm text-[#94a3b8] leading-relaxed mb-4">
                Instead of ranking a long list or scoring items 1-10, you make simple A-vs-B choices. Each vote is a single question: <span className="text-[#e2e8f0] font-medium">{"\"Which matters more?\""}</span>
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { icon: 'bolt', title: 'Fast', text: 'Each comparison takes 2-3 seconds. No overthinking.' },
                  { icon: 'brain', title: 'Intuitive', text: 'Binary choices tap into gut instinct, which is often more reliable for strategic decisions.' },
                  { icon: 'chart', title: 'Rigorous', text: 'Bradley-Terry statistical model converts your choices into a mathematically robust ranking.' },
                  { icon: 'users', title: 'Collaborative', text: 'Multiple team members can vote simultaneously. The model aggregates everyone\'s input.' },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded bg-[#f97316]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] text-[#f97316] font-bold">
                        {item.icon === 'bolt' ? '\u26A1' : item.icon === 'brain' ? '\u2B50' : item.icon === 'chart' ? '\u2191' : '\u2B55'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#e2e8f0]">{item.title}</p>
                      <p className="text-xs text-[#64748b]">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual example of a pairwise vote */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-xs">
                <p className="text-[10px] uppercase tracking-widest text-[#475569] mb-3 text-center">Example comparison</p>
                <div className="flex flex-col gap-3">
                  <div className="bg-[#0f1419] border border-[#f97316]/40 rounded-lg p-4 text-center cursor-default hover:border-[#f97316] transition-colors">
                    <p className="text-[10px] uppercase tracking-widest text-[#f97316] mb-1">Strategic Priority</p>
                    <p className="text-sm font-bold text-[#e2e8f0]">Growth Objective</p>
                    <p className="text-[10px] text-[#64748b] mt-1">Revenue expansion through new markets</p>
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold text-[#475569]">vs</span>
                  </div>
                  <div className="bg-[#0f1419] border border-[#2a3a4e] rounded-lg p-4 text-center cursor-default hover:border-[#f97316] transition-colors">
                    <p className="text-[10px] uppercase tracking-widest text-[#3b82f6] mb-1">Strategic Priority</p>
                    <p className="text-sm font-bold text-[#e2e8f0]">Risk Posture</p>
                    <p className="text-[10px] text-[#64748b] mt-1">How aggressive should M&A strategy be</p>
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
                The more votes, the more reliable the rankings. Share the session code with colleagues so they can contribute their own pairwise comparisons. All votes are aggregated by the Bradley-Terry model to produce a single consensus ranking.
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
              <p className="text-[10px] text-[#475569] text-center">
                Teammates join at the same URL with this code
              </p>
            </div>
          </div>
        </div>

        {/* ── More Votes = Better Results ── */}
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
            {'Step 1 starts with 6 strategic priority dimensions \u00B7 ~25 votes \u00B7 takes about 2 minutes'}
          </p>
        </div>

      </main>
    </div>
  );
}
