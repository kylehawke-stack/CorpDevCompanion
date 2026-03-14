import { useState, useEffect, useRef } from 'react';
import { useGameState } from '../context/GameStateContext.tsx';
import { generateInsights, generateStrategicIdeas } from '../lib/api.ts';
import { Button } from '../components/ui/Button.tsx';
import { Spinner } from '../components/ui/Spinner.tsx';
import { CreateSessionModal } from '../components/session/CreateSessionModal.tsx';
import { supabase } from '../lib/supabase.ts';
import { syncPhaseChange } from '../lib/supabaseSync.ts';
import { ProgressTracker, phaseToStep } from '../components/ProgressTracker.tsx';
import { BRIEFING_CARD_GROUPS } from '../types/index.ts';
import type { FinancialHighlight } from '../types/index.ts';
import { submitCorrection } from '../lib/briefingCorrections.ts';
import type { BriefingCorrection } from '../lib/briefingCorrections.ts';

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
 * Handles double quotes, single quotes (with contractions like we're, don't),
 * and curly/smart quotes.
 */
function extractQuote(observation: string): { text: string; speaker: string; surrounding: string } | null {
  const VERBS = 'noted|said|stated|asked|observed|commented|probed|remarked|explained|highlighted|mentioned|emphasized|stressed|warned|acknowledged|admitted|argued|believes|suggested|added|responded|countered|challenged|described|revealed|pointed out|contended|claimed';
  const TITLES = '(?:CEO|CFO|Analyst|analyst|President|SVP|VP|COO|CTO|CMO|CIO|Director|Chairman|Managing Director|Partner|Head of [A-Za-z]+)';

  // Helper: find the actual end of a single-quoted string, skipping contractions.
  // A closing ' is one NOT followed by a lowercase letter (e.g., "we're" keeps going).
  function extractSingleQuoteContent(text: string, startIdx: number): string | null {
    // startIdx points to the opening ' — scan forward
    let i = startIdx + 1;
    while (i < text.length) {
      if (text[i] === "'" || text[i] === '\u2019') {
        // Is this a contraction (followed by a lowercase letter)?
        if (i + 1 < text.length && /[a-z]/.test(text[i + 1])) {
          i++; // skip, it's a contraction like we're
          continue;
        }
        // Found the real closing quote
        return text.slice(startIdx + 1, i);
      }
      i++;
    }
    return null;
  }

  // Helper: try to extract quote from a known position where we found an opening quote char
  function tryExtractFrom(obs: string, quoteStart: number): string | null {
    const ch = obs[quoteStart];
    if (ch === '"' || ch === '\u201c') {
      // Double quote — find closing " or "
      const closeIdx = obs.indexOf('"', quoteStart + 1) !== -1
        ? obs.indexOf('"', quoteStart + 1)
        : obs.indexOf('\u201d', quoteStart + 1);
      if (closeIdx > quoteStart + 5) return obs.slice(quoteStart + 1, closeIdx);
    } else if (ch === "'" || ch === '\u2018') {
      return extractSingleQuoteContent(obs, quoteStart);
    }
    return null;
  }

  // Helper: find a name/title before a given position
  function findSpeaker(before: string): string {
    const titleName = before.match(new RegExp(`(?:As\\s+)?${TITLES}\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`, 'i'));
    if (titleName) return titleName[0].replace(/^As\s+/i, '').trim();
    const name = before.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
    return name ? name[1] : 'Management';
  }

  // Pattern 1: [Title +] Name + verb + [:|,] + quote
  const verbPattern = new RegExp(
    `((?:As\\s+)?(?:${TITLES}\\s+)?[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)+)\\s+(?:${VERBS})(?:\\s*[:,]\\s*|\\s+)(["\u201c'\u2018])`,
    'i'
  );
  const m1 = observation.match(verbPattern);
  if (m1) {
    const quoteCharIdx = observation.indexOf(m1[2], observation.indexOf(m1[0]) + m1[1].length);
    const content = tryExtractFrom(observation, quoteCharIdx);
    if (content && content.length >= 10) {
      const speaker = m1[1].replace(/^As\s+/i, '').trim();
      const fullMatchStart = observation.indexOf(m1[0]);
      const surrounding = observation.slice(0, fullMatchStart).trim();
      return { text: content.trim(), speaker, surrounding };
    }
  }

  // Pattern 2: ..., noting/saying: "quote"
  const contextVerb = observation.match(/,\s*(?:noting|saying|stating|adding|explaining|emphasizing|stressing|warning|observing|commenting|remarking)(?:\s*[:,]\s*|\s+)(["'\u201c\u2018])/i);
  if (contextVerb) {
    const quoteCharIdx = observation.indexOf(contextVerb[1], observation.indexOf(contextVerb[0]));
    const content = tryExtractFrom(observation, quoteCharIdx);
    if (content && content.length >= 10) {
      const before = observation.slice(0, observation.indexOf(contextVerb[0]));
      return { text: content.trim(), speaker: findSpeaker(before), surrounding: before.trim() };
    }
  }

  // Pattern 3 (fallback): Find any substantial quoted text (20+ chars)
  for (let i = 0; i < observation.length; i++) {
    const ch = observation[i];
    if (ch === '"' || ch === '\u201c' || ch === "'" || ch === '\u2018') {
      const content = tryExtractFrom(observation, i);
      if (content && content.length >= 20) {
        const before = observation.slice(0, i);
        return { text: content.trim(), speaker: findSpeaker(before), surrounding: before.trim() };
      }
    }
  }

  return null;
}

// ── Segment bar colors ──

const SEGMENT_COLORS = ['bg-[#f97316]', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500'];

// ── Main Page ──

export function BriefingPage() {
  const { state, dispatch } = useGameState();
  const highlights = state.financialHighlights;
  const segments = state.revenueSegments;
  const profile = state.companyProfile;
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [carouselIndexes, setCarouselIndexes] = useState<Record<string, number>>({});

  const hasPeerData = state.peerFinancials.length > 0;
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const retryAttempted = useRef(false);

  // Correction/feedback state
  const [correctionForm, setCorrectionForm] = useState<{ label: string; idx: number } | null>(null);
  const [correctionType, setCorrectionType] = useState<BriefingCorrection['issue_type']>('hallucination');
  const [correctionNote, setCorrectionNote] = useState('');
  const [flaggedCards, setFlaggedCards] = useState<Set<string>>(new Set());
  const [correctionToast, setCorrectionToast] = useState(false);

  // Auto-retry missing pieces if we land here without insights or ideas
  useEffect(() => {
    if (!state.promptData || retryAttempted.current || retrying) return;
    const hasInsights = highlights.some(h => h.label === 'Earnings Call Insights' || h.label === 'Analyst Perspectives');
    const hasIdeas = state.ideas.length > 0;
    if (hasInsights && hasIdeas) return;

    retryAttempted.current = true;
    setRetrying(true);

    const retries: Promise<void>[] = [];
    if (!hasInsights) {
      retries.push(
        generateInsights(state.promptData!).then(({ highlights: cards }) => {
          dispatch({ type: 'SET_INSIGHTS', highlights: cards });
        })
      );
    }
    if (!hasIdeas) {
      retries.push(
        generateStrategicIdeas(state.promptData!).then(({ ideas }) => {
          dispatch({ type: 'SET_IDEAS_ONLY', ideas });
        })
      );
    }

    Promise.all(retries)
      .catch((err) => {
        console.error('Briefing retry failed:', err);
        setBriefingError('Failed to generate analysis. Please refresh and try again.');
      })
      .finally(() => setRetrying(false));
  }, [state.ideas.length, state.promptData, retrying, dispatch, highlights]);

  const handleContinue = () => {
    const nextPhase = hasPeerData ? 'peer_benchmarking' : 'voting_step1';
    dispatch({ type: 'SET_PHASE', phase: nextPhase });
    // Sync phase to Supabase so Realtime doesn't revert to stale 'briefing'
    if (state.sessionId) {
      syncPhaseChange(state.sessionId, nextPhase);
    }
  };

  // Derive card groups from the shared contract
  const kpiHighlights = BRIEFING_CARD_GROUPS.kpiLabels
    .map(label => highlights.find(h => h.label === label))
    .filter(Boolean) as FinancialHighlight[];

  const narrativeHighlights = BRIEFING_CARD_GROUPS.narrativeLabels
    .map(label => highlights.find(h => h.label === label))
    .filter(Boolean) as FinancialHighlight[];

  const pullquoteHighlights = highlights.filter(h =>
    (BRIEFING_CARD_GROUPS.pullquoteLabels as readonly string[]).includes(h.label)
  );

  // Any remaining cards not captured above (fallback for older data shapes)
  const usedLabels: Set<string> = new Set([
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
            {supabase && state.ideas.length > 0 && (
              state.isCollaborative && state.shareCode ? (
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[#64748b] font-mono">
                    {`${window.location.origin}${window.location.pathname}?s=${state.shareCode}`}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?s=${state.shareCode}`);
                    }}
                    className="px-2 py-1 rounded bg-[#f97316]/20 text-[#f97316] text-xs font-medium hover:bg-[#f97316]/30 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateSession(true)}
                  className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f97316]/10 border border-[#f97316]/30 text-[#f97316] hover:bg-[#f97316]/20 hover:border-[#f97316]/50 transition-colors text-sm font-semibold whitespace-nowrap"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Link / Add Others
                </button>
              )
            )}
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

        {/* ── Pullquote Carousels (Earnings Call + Analyst + Competitive) ── */}
        {(() => {
          const hasInsightsCards = pullquoteHighlights.some(h => h.label === 'Earnings Call Insights' || h.label === 'Analyst Perspectives');
          const hasCompetitiveCards = pullquoteHighlights.some(h => h.label === 'Competitive Positioning');
          const showInsightsSpinner = !hasInsightsCards && state.promptData;
          const showCompetitiveSpinner = !hasCompetitiveCards && state.selectedPeers.length > 0;

          return (hasInsightsCards || hasCompetitiveCards || showInsightsSpinner || showCompetitiveSpinner) ? (
            <div className="space-y-5 mb-10">
              {/* Insights loading spinner */}
              {showInsightsSpinner && (
                <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-8 text-center">
                  <Spinner size="md" />
                  <p className="text-sm text-[#e2e8f0] mt-3">Analyzing earnings calls & analyst coverage...</p>
                </div>
              )}
              {/* Competitive loading spinner */}
              {showCompetitiveSpinner && !showInsightsSpinner && (
                <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Spinner size="sm" />
                    <p className="text-sm text-[#94a3b8]">Analyzing competitive landscape...</p>
                  </div>
                </div>
              )}
              {(BRIEFING_CARD_GROUPS.pullquoteLabels as readonly string[]).map((label) => {
                const cards = pullquoteHighlights.filter(h => h.label === label);
                if (cards.length === 0) return null;
              const idx = carouselIndexes[label] ?? 0;
              const h = cards[idx];
              // Only extract quotes for Earnings Call and Analyst cards — not Competitive Positioning
              const extracted = label !== 'Competitive Positioning' ? extractQuote(h.observation) : null;
              const hasPrev = idx > 0;
              const hasNext = idx < cards.length - 1;

              const cardKey = `${label}:${idx}`;
              const isFlagged = flaggedCards.has(cardKey);
              const isFormOpen = correctionForm?.label === label && correctionForm?.idx === idx;

              return (
                <div key={label} className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-6 relative">
                  <div className="flex items-center justify-between mb-4">
                    <p className="uppercase tracking-widest text-[10px] font-semibold text-[#f97316]">
                      {h.label}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-[#64748b]">{h.detail}</p>
                      <button
                        onClick={() => {
                          if (isFlagged) return;
                          setCorrectionForm(isFormOpen ? null : { label, idx });
                          setCorrectionNote('');
                          setCorrectionType('hallucination');
                        }}
                        className={`p-1 rounded transition-colors ${isFlagged ? 'text-amber-500' : 'text-[#475569] hover:text-[#94a3b8]'}`}
                        title={isFlagged ? 'Flagged' : 'Report issue'}
                        aria-label="Report issue"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill={isFlagged ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-16l11 5-11 5m0-10h2a9 9 0 019 0h0" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <p className="text-xl font-bold text-[#e2e8f0] mb-4">{h.value}</p>

                  {extracted?.surrounding && (
                    <p className="text-[15px] text-[#94a3b8] leading-relaxed mb-5">
                      {extracted.surrounding}
                    </p>
                  )}

                  {extracted ? (
                    <blockquote className="border-l-4 border-[#f97316] pl-6 py-4 bg-[#0f1419]/60 rounded-r-lg">
                      <p className="text-[17px] text-[#e2e8f0] italic leading-relaxed font-light">
                        &ldquo;{extracted.text}&rdquo;
                      </p>
                      <p className="text-sm text-[#f97316] mt-3 font-semibold not-italic">
                        &mdash; {extracted.speaker}
                      </p>
                    </blockquote>
                  ) : (
                    <p className="text-[15px] text-[#94a3b8] leading-relaxed">
                      <StyledText text={h.observation} />
                    </p>
                  )}

                  {/* Inline correction form */}
                  {isFormOpen && (
                    <div className="mt-4 p-4 bg-[#0f1419] border border-[#2a3a4e] rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <select
                          value={correctionType}
                          onChange={(e) => setCorrectionType(e.target.value as BriefingCorrection['issue_type'])}
                          className="bg-[#1a2332] border border-[#2a3a4e] text-[#e2e8f0] text-xs rounded px-2 py-1.5"
                        >
                          <option value="hallucination">Hallucination</option>
                          <option value="inaccurate">Inaccurate</option>
                          <option value="incomplete">Incomplete</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <textarea
                        value={correctionNote}
                        onChange={(e) => setCorrectionNote(e.target.value)}
                        placeholder="Describe the issue (e.g., 'Wolf Gourmet is owned by HBB, not a competitor')"
                        className="w-full bg-[#1a2332] border border-[#2a3a4e] text-[#e2e8f0] text-sm rounded px-3 py-2 placeholder-[#475569] resize-none"
                        rows={2}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={async () => {
                            if (!correctionNote.trim() || !profile?.symbol) return;
                            const ok = await submitCorrection({
                              target_symbol: profile.symbol,
                              card_label: label,
                              card_index: idx,
                              issue_type: correctionType,
                              original_text: h.observation.slice(0, 500),
                              user_note: correctionNote.trim(),
                            });
                            if (ok) {
                              setFlaggedCards(prev => new Set(prev).add(cardKey));
                              setCorrectionToast(true);
                              setTimeout(() => setCorrectionToast(false), 3000);
                            }
                            setCorrectionForm(null);
                          }}
                          disabled={!correctionNote.trim()}
                          className="px-3 py-1.5 text-xs font-semibold rounded bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30 hover:bg-[#f97316]/30 disabled:opacity-40 disabled:cursor-default transition-colors"
                        >
                          Submit
                        </button>
                        <button
                          onClick={() => setCorrectionForm(null)}
                          className="px-3 py-1.5 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Carousel controls */}
                  {cards.length > 1 && (
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#2a3a4e]">
                      <button
                        onClick={() => setCarouselIndexes(prev => ({ ...prev, [label]: idx - 1 }))}
                        disabled={!hasPrev}
                        className={`p-1.5 rounded-lg transition-colors ${hasPrev ? 'text-[#e2e8f0] hover:bg-[#2a3a4e]' : 'text-[#2a3a4e] cursor-default'}`}
                        aria-label="Previous"
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {cards.map((_, dotIdx) => (
                          <button
                            key={dotIdx}
                            onClick={() => setCarouselIndexes(prev => ({ ...prev, [label]: dotIdx }))}
                            className={`rounded-full transition-all ${dotIdx === idx ? 'w-2.5 h-2.5 bg-[#f97316]' : 'w-1.5 h-1.5 bg-[#475569] hover:bg-[#64748b]'}`}
                            aria-label={`Card ${dotIdx + 1}`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => setCarouselIndexes(prev => ({ ...prev, [label]: idx + 1 }))}
                        disabled={!hasNext}
                        className={`p-1.5 rounded-lg transition-colors ${hasNext ? 'text-[#e2e8f0] hover:bg-[#2a3a4e]' : 'text-[#2a3a4e] cursor-default'}`}
                        aria-label="Next"
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          ) : null;
        })()}

        {/* Error state */}
        {briefingError && (
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-8 mb-10 text-center">
            <p className="text-sm text-red-400 mt-3">{briefingError}</p>
            <Button onClick={() => window.location.reload()} size="sm" className="mt-4">
              Refresh Page
            </Button>
          </div>
        )}

        {/* ── CTA ── */}
        <div className="text-center pt-2 pb-8 space-y-3">
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
          {state.selectedPeers.length > 0 && (
            <div>
              <button
                onClick={() => dispatch({ type: 'SET_PHASE', phase: 'peer_selection' })}
                className="text-sm text-[#64748b] hover:text-[#f97316] transition-colors"
              >
                &larr; Back to Select Competitors
              </button>
            </div>
          )}
        </div>

        {/* Create Session Modal */}
        {showCreateSession && (
          <CreateSessionModal onClose={() => setShowCreateSession(false)} />
        )}

        {/* Correction submitted toast */}
        {correctionToast && (
          <div className="fixed bottom-6 right-6 bg-[#1a2332] border border-[#f97316]/30 text-[#e2e8f0] text-sm px-4 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2">
            Correction saved — will be used in future analyses
          </div>
        )}
      </div>
    </div>
  );
}
