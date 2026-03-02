import { useGameState } from '../context/GameStateContext.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Spinner } from '../components/ui/Spinner.tsx';

function formatRevenue(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

/**
 * Render text with negative values (in parentheses) highlighted in red.
 * Matches patterns like (7.3%), ($5M), (0.8x), etc.
 */
function StyledText({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split(/(\([^)]*\))/g);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        // Check if this is a parenthesized value that looks negative (contains a number)
        if (part.startsWith('(') && part.endsWith(')') && /\d/.test(part)) {
          return <span key={i} className="text-negative font-semibold">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

/**
 * Render insight observation text, pulling out attributed quotes as styled blockquotes.
 * Matches patterns like: As CEO Scott Tidey noted: "quote text"
 * or: Analyst Adam Bradley asked: "quote text"
 */
function InsightObservation({ text }: { text: string }) {
  // Split text around quoted strings with attribution
  const quotePattern = /((?:As\s+)?(?:CEO|CFO|Analyst|analyst|President|SVP|VP|COO)\s+[^:""]+(?:noted|said|stated|asked|observed|commented|probed|remarked|explained|highlighted|mentioned|emphasized):\s*[""]([^""]+)[""])/gi;

  const parts: { type: 'text' | 'quote'; content: string; attribution?: string }[] = [];
  let lastIndex = 0;
  let match;

  const regex = new RegExp(quotePattern);
  while ((match = regex.exec(text)) !== null) {
    // Text before the quote
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    // Extract attribution and quote
    const fullMatch = match[0];
    const quoteStart = fullMatch.indexOf('\u201c') !== -1 ? fullMatch.indexOf('\u201c') : fullMatch.indexOf('"');
    const attribution = fullMatch.slice(0, quoteStart).replace(/:\s*$/, '').trim();
    const quoteText = match[2] || fullMatch.slice(quoteStart + 1, -1);
    parts.push({ type: 'quote', content: quoteText, attribution });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  // If no quotes found, render as plain styled text
  if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text')) {
    return <StyledText text={text} className="text-sm text-body leading-relaxed block" />;
  }

  return (
    <div className="space-y-2">
      {parts.map((part, i) =>
        part.type === 'quote' ? (
          <blockquote key={i} className="border-l-3 border-accent pl-4 py-1 my-2 bg-surface-elevated rounded-r-lg">
            <p className="text-sm text-body italic leading-relaxed">"{part.content}"</p>
            {part.attribution && (
              <p className="text-xs text-muted mt-1">— {part.attribution}</p>
            )}
          </blockquote>
        ) : (
          <StyledText key={i} text={part.content} className="text-sm text-body leading-relaxed" />
        )
      )}
    </div>
  );
}

// Segment bar colors
const SEGMENT_COLORS = [
  'bg-accent',
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
];

export function BriefingPage() {
  const { state, dispatch } = useGameState();
  const highlights = state.financialHighlights;
  const segments = state.revenueSegments;
  const profile = state.companyProfile;

  const hasPeerData = state.peerFinancials.length > 0;

  const handleContinue = () => {
    dispatch({ type: 'SET_PHASE', phase: hasPeerData ? 'peer_benchmarking' : 'voting_step1' });
  };

  // Split AI highlights into: first row (before revenue mix), second row (after), then insights
  const firstRowLabels = ['Revenue & Growth'];
  const secondRowLabels = ['Profitability', 'Cash Flow & Firepower', 'Acquisition Firepower', 'Leverage & Capacity'];
  const insightLabels = ['Acquisitiveness', 'Earnings Call Insights', 'Analyst Perspectives', 'Competitive Positioning'];

  const firstRowCards = highlights.filter(h => firstRowLabels.includes(h.label));
  const secondRowCards = highlights.filter(h => secondRowLabels.includes(h.label));
  const insightCards = highlights.filter(h => insightLabels.includes(h.label));

  // Fallback: if Claude still returns "Balance Sheet" as a single card
  const balanceSheetFallback = highlights.find(h => h.label === 'Balance Sheet');
  if (balanceSheetFallback && !secondRowCards.some(h => h.label === 'Acquisition Firepower')) {
    secondRowCards.push(balanceSheetFallback);
  }

  return (
    <div className="min-h-screen bg-surface-base py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {profile && (
            <div className="inline-flex items-center gap-3 mb-4">
              <img src={profile.image} alt="" className="w-10 h-10 rounded object-contain bg-white p-0.5" />
              <div className="text-left">
                <p className="font-semibold text-heading">{profile.companyName}</p>
                <p className="text-xs text-muted">{profile.sector} &middot; {profile.industry}</p>
              </div>
            </div>
          )}
          <h1 className="text-2xl font-bold text-heading tracking-tight">
            Intelligence Briefing
          </h1>
          <p className="text-sm text-muted mt-1">
            Key findings from 2 years of financial statements, 4 quarterly earnings calls, analyst consensus, and competitive landscape analysis
          </p>
        </div>

        {/* Row 1: Revenue & Growth card(s) */}
        {firstRowCards.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {firstRowCards.map((h, i) => (
              <div
                key={i}
                className="bg-surface-card rounded-xl border border-edge shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
                  {h.label}
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <StyledText text={h.value} className="text-2xl font-bold text-heading" />
                  <StyledText text={h.detail} className="text-sm text-muted" />
                </div>
                <StyledText text={h.observation} className="text-sm text-body leading-snug mt-2 block" />
              </div>
            ))}
          </div>
        )}

        {/* Revenue Mix Card — structured table from real data (position 2) */}
        {segments.length > 0 && (
          <div className="bg-surface-card rounded-xl border border-edge shadow-sm p-6 mb-4 hover:shadow-md transition-shadow">
            <p className="text-xs font-medium text-muted uppercase tracking-wider mb-4">
              Revenue Mix by Product Segment
            </p>

            {/* Stacked bar */}
            <div className="flex rounded-full overflow-hidden h-4 mb-4">
              {segments.map((s, i) => (
                <div
                  key={s.name}
                  className={`${SEGMENT_COLORS[i % SEGMENT_COLORS.length]} transition-all`}
                  style={{ width: `${s.percent}%` }}
                  title={`${s.name}: ${s.percent}%`}
                />
              ))}
            </div>

            {/* Table */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge">
                  <th className="text-left py-2 font-medium text-muted">Segment</th>
                  <th className="text-right py-2 font-medium text-muted">Revenue</th>
                  <th className="text-right py-2 font-medium text-muted w-20">Share</th>
                </tr>
              </thead>
              <tbody>
                {segments.map((s, i) => (
                  <tr key={s.name} className="border-b border-edge/50">
                    <td className="py-2 flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-sm ${SEGMENT_COLORS[i % SEGMENT_COLORS.length]}`} />
                      <span className="text-heading">{s.name}</span>
                    </td>
                    <td className="py-2 text-right font-mono text-body">
                      {formatRevenue(s.revenue)}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-accent">
                      {s.percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Row 2: Profitability, Cash Flow, Acquisition Firepower, Leverage */}
        {secondRowCards.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 mb-4">
            {secondRowCards.map((h, i) => (
              <div
                key={i}
                className="bg-surface-card rounded-xl border border-edge shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
                  {h.label}
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <StyledText text={h.value} className="text-2xl font-bold text-heading" />
                  <StyledText text={h.detail} className="text-sm text-muted" />
                </div>
                <StyledText text={h.observation} className="text-sm text-body leading-snug mt-2 block" />
              </div>
            ))}
          </div>
        )}

        {/* Qualitative Insight Cards — full-width, structured layout */}
        {insightCards.length > 0 ? (
          <div className="space-y-4 mb-10">
            {insightCards.map((h, i) => (
              <div
                key={i}
                className="bg-surface-card rounded-xl border border-edge shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-muted uppercase tracking-wider">
                    {h.label}
                  </p>
                  <StyledText text={h.detail} className="text-xs text-dimmed" />
                </div>
                <p className="text-lg font-semibold text-heading mb-3">{h.value}</p>
                <InsightObservation text={h.observation} />
              </div>
            ))}
          </div>
        ) : state.ideas.length === 0 ? (
          <div className="bg-surface-card rounded-xl border border-edge shadow-sm p-8 mb-10 text-center">
            <Spinner size="lg" />
            <p className="text-sm text-body mt-3">Generating strategic analysis...</p>
            <p className="text-xs text-dimmed mt-1">AI is synthesizing earnings calls, analyst data, and competitive landscape</p>
          </div>
        ) : null}

        {/* Begin Voting Button */}
        <div className="text-center pt-2 pb-4">
          <Button onClick={handleContinue} size="lg" className="px-10" disabled={state.ideas.length === 0}>
            {state.ideas.length === 0 ? 'Generating strategic options...' : hasPeerData ? 'Continue to Peer Benchmarking' : 'Begin Strategic Prioritization'}
          </Button>
          {state.ideas.length > 0 && (
            <p className="text-xs text-dimmed mt-3">
              {state.ideas.length} strategic options ready for pairwise comparison across 6 dimensions
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
