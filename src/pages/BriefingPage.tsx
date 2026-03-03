import { useGameState } from '../context/GameStateContext.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Spinner } from '../components/ui/Spinner.tsx';
import { ProgressTracker, phaseToStep } from '../components/ProgressTracker.tsx';
import { BRIEFING_CARD_GROUPS } from '../types/index.ts';
import type { FinancialHighlight } from '../types/index.ts';

// ── Formatters ──

function formatRevenue(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

/** Highlight negative values (in parentheses) in red */
function StyledText({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split(/(\([^)]*\))/g);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('(') && part.endsWith(')') && /\d/.test(part)) {
          return <span key={i} className="text-red-400 font-semibold">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

/**
 * Extract a quote + attribution from observation text.
 * Matches: As CEO Scott Tidey noted: "quote text"
 */
function extractQuote(observation: string): { text: string; speaker: string; surrounding: string } | null {
  const regex = /((?:As\s+)?(?:CEO|CFO|Analyst|analyst|President|SVP|VP|COO)\s+[^:"\u201c]+)(?:noted|said|stated|asked|observed|commented|probed|remarked|explained|highlighted|mentioned|emphasized):\s*["\u201c]([^"\u201d]+)["\u201d]/i;
  const match = observation.match(regex);
  if (!match) return null;

  const speaker = match[1].replace(/^As\s+/i, '').trim();
  const text = match[2].trim();
  const quoteStart = observation.indexOf(match[0]);
  const surrounding = observation.slice(0, quoteStart).trim();

  return { text, speaker, surrounding };
}

// ── Segment bar colors ──

const SEGMENT_COLORS = ['bg-[#f97316]', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500'];

// ── Main Page ──

export function BriefingPage() {
  const { state, dispatch } = useGameState();
  const highlights = state.financialHighlights;
  const segments = state.revenueSegments;
  const profile = state.companyProfile;
  const hasPeerData = state.peerFinancials.length > 0;

  const handleContinue = () => {
    dispatch({ type: 'SET_PHASE', phase: hasPeerData ? 'peer_benchmarking' : 'voting_step1' });
  };

  // Derive card groups from the shared contract
  const kpiHighlights = BRIEFING_CARD_GROUPS.kpiLabels
    .map(label => highlights.find(h => h.label === label))
    .filter(Boolean) as FinancialHighlight[];

  const narrativeHighlights = BRIEFING_CARD_GROUPS.narrativeLabels
    .map(label => highlights.find(h => h.label === label))
    .filter(Boolean) as FinancialHighlight[];

  const pullquoteHighlights = BRIEFING_CARD_GROUPS.pullquoteLabels
    .map(label => highlights.find(h => h.label === label))
    .filter(Boolean) as FinancialHighlight[];

  // Any remaining cards not captured above (fallback for older data shapes)
  const usedLabels = new Set([
    ...BRIEFING_CARD_GROUPS.kpiLabels,
    ...BRIEFING_CARD_GROUPS.narrativeLabels,
    ...BRIEFING_CARD_GROUPS.pullquoteLabels,
  ]);
  const extraHighlights = highlights.filter(h => !usedLabels.has(h.label));

  return (
    <div className="min-h-screen bg-[#0f1419] py-10 px-4">
      <div className="max-w-7xl mx-auto">

        {/* ── Progress Tracker ── */}
        <div className="hidden md:flex justify-end mb-4">
          <ProgressTracker currentStep={phaseToStep(state.phase)} />
        </div>

        {/* ── Company Header ── */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            {profile?.image && (
              <img
                src={profile.image}
                alt=""
                className="w-12 h-12 rounded-lg object-contain bg-white/10 p-1 border border-[#2a3a4e]"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">
                  {profile?.companyName || 'Company'}
                </h1>
                {profile?.symbol && (
                  <span className="font-mono text-sm text-[#64748b] bg-[#1a2332] px-2 py-0.5 rounded border border-[#2a3a4e]">
                    {profile.symbol}
                  </span>
                )}
              </div>
              <p className="text-sm text-[#64748b] mt-0.5">
                {[profile?.sector, profile?.industry, profile?.ceo ? `CEO: ${profile.ceo}` : null].filter(Boolean).join(' \u00B7 ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316]">
              Intelligence Briefing
            </span>
            <span className="text-[#2a3a4e]">/</span>
            <span className="text-xs text-[#64748b]">
              2 years of financials, 4 quarterly earnings calls, analyst consensus, competitive landscape
            </span>
          </div>
        </header>

        {/* ── KPI Strip ── */}
        {kpiHighlights.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {kpiHighlights.map((h) => (
              <div key={h.label} className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl px-5 py-4">
                <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-2">
                  {h.label === 'Acquisition Firepower' ? 'Firepower' : h.label.split(' &')[0]}
                </p>
                <p className="font-mono text-2xl font-bold text-white leading-none">
                  <StyledText text={h.value} />
                </p>
                <p className="text-xs text-[#64748b] mt-1.5 font-mono">
                  <StyledText text={h.detail} />
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Revenue Mix ── */}
        {segments.length > 0 && (
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316]">
                Revenue Mix
              </p>
              <span className="text-xs text-[#64748b]">by product segment</span>
            </div>
            <div className="flex rounded-full overflow-hidden h-3 mb-4">
              {segments.map((s, i) => (
                <div
                  key={s.name}
                  className={`${SEGMENT_COLORS[i % SEGMENT_COLORS.length]} transition-all`}
                  style={{ width: `${s.percent}%` }}
                  title={`${s.name}: ${s.percent}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {segments.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-sm ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`} />
                  <span className="text-sm text-[#e2e8f0]">{s.name}</span>
                  <span className="font-mono text-sm text-[#64748b]">{formatRevenue(s.revenue)}</span>
                  <span className="font-mono text-sm font-semibold text-[#f97316]">{s.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Narrative Analysis Cards (2-column) ── */}
        {narrativeHighlights.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {narrativeHighlights.map((h) => (
              <div key={h.label} className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5">
                <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-3">
                  {h.label}
                </p>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  <StyledText text={h.observation} />
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Extra cards (fallback for unexpected labels) ── */}
        {extraHighlights.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {extraHighlights.map((h) => (
              <div key={h.label} className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-5">
                <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316] mb-2">
                  {h.label}
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <StyledText text={h.value} className="text-xl font-bold text-[#e2e8f0]" />
                  <StyledText text={h.detail} className="text-xs text-[#64748b]" />
                </div>
                <p className="text-sm text-[#94a3b8] leading-relaxed mt-2">
                  <StyledText text={h.observation} />
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Pullquote Section (Earnings Call + Analyst) ── */}
        {pullquoteHighlights.length > 0 ? (
          <div className="space-y-5 mb-10">
            {pullquoteHighlights.map((h) => {
              const extracted = extractQuote(h.observation);
              return (
                <div key={h.label} className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316]">
                      {h.label}
                    </p>
                    <p className="text-xs text-[#64748b]">{h.detail}</p>
                  </div>

                  <p className="text-lg font-semibold text-[#e2e8f0] mb-4">{h.value}</p>

                  {extracted?.surrounding && (
                    <p className="text-sm text-[#94a3b8] leading-relaxed mb-4">
                      {extracted.surrounding}
                    </p>
                  )}

                  {extracted ? (
                    <blockquote className="border-l-4 border-[#f97316] pl-5 py-3 bg-[#f97316]/[0.04] rounded-r-lg">
                      <p className="text-base text-[#e2e8f0] italic leading-relaxed">
                        &ldquo;{extracted.text}&rdquo;
                      </p>
                      <p className="text-sm text-[#f97316] mt-2 font-medium not-italic">
                        &mdash; {extracted.speaker}
                      </p>
                    </blockquote>
                  ) : (
                    <p className="text-sm text-[#94a3b8] leading-relaxed">
                      <StyledText text={h.observation} />
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : state.ideas.length === 0 ? (
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-8 mb-10 text-center">
            <Spinner size="lg" />
            <p className="text-sm text-[#e2e8f0] mt-3">Generating strategic analysis...</p>
            <p className="text-xs text-[#64748b] mt-1">Synthesizing earnings calls, analyst data, and competitive landscape</p>
          </div>
        ) : null}

        {/* ── CTA ── */}
        <div className="text-center pt-2 pb-8">
          <Button onClick={handleContinue} size="lg" className="px-10" disabled={state.ideas.length === 0}>
            {state.ideas.length === 0
              ? 'Generating strategic options...'
              : hasPeerData
                ? 'Continue to Peer Benchmarking'
                : 'Begin Strategic Prioritization'}
          </Button>
          {state.ideas.length > 0 && (
            <p className="text-xs text-[#64748b] mt-3">
              {state.ideas.length} strategic options ready for pairwise comparison across 6 dimensions
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
