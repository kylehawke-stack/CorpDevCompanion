import { useState, useEffect } from 'react';
import { useGameState } from '../context/GameStateContext.tsx';
import { analyzeCompany, generateBriefing, fetchPeers } from '../lib/api.ts';
import { Button } from '../components/ui/Button.tsx';
import { Spinner } from '../components/ui/Spinner.tsx';

const COMPANIES = [
  { symbol: 'HBB', name: 'Hamilton Beach Brands', logo: 'https://images.financialmodelingprep.com/symbol/HBB.png' },
];

const DATA_STEPS = [
  { label: 'Company profile, sector data & market position', delay: 0 },
  { label: 'Income statements, balance sheets & cash flow', delay: 1500 },
  { label: 'Revenue segmentation & key financial metrics', delay: 3000 },
  { label: 'Earnings call transcripts & analyst consensus', delay: 4500 },
  { label: 'Competitive landscape & SEC filings', delay: 6000 },
  { label: 'Synthesizing data into strategic framework...', delay: 8000 },
  { label: 'Generating intelligence briefing cards...', delay: 11000 },
  { label: 'Building strategic priority options...', delay: 14000 },
];

export function WelcomePage() {
  const { dispatch } = useGameState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(-1);
  const selected = COMPANIES[0]; // Only HBB for now

  // Animate through data gathering steps while loading
  useEffect(() => {
    if (!loading) {
      setActiveStep(-1);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    DATA_STEPS.forEach((step, i) => {
      timers.push(setTimeout(() => setActiveStep(i), step.delay));
    });
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  const handleStart = async () => {
    setLoading(true);
    setError(null);

    try {
      dispatch({ type: 'START_ANALYSIS', companyProfile: { symbol: selected.symbol, companyName: selected.name, description: '', marketCap: 0, price: 0, sector: '', industry: '', ceo: '', fullTimeEmployees: '', website: '', image: selected.logo, country: '' } });

      // Phase 1: Fetch financial data from FMP (~3-5s)
      const data = await analyzeCompany(selected.symbol);
      dispatch({ type: 'START_ANALYSIS', companyProfile: data.profile });

      // Phase 2: Kick off briefing generation in background AND fetch peers in parallel
      const briefingPromise = generateBriefing(data.promptData);

      // Store financial data for later merging
      const highlights = data.highlights ?? [];
      const revenueSegments = data.revenueSegments ?? [];
      const competitorProfiles = data.competitorProfiles ?? [];

      // Fetch peers — if this fails, skip to briefing
      let peers: import('../types/index.ts').PeerCompany[] = [];
      try {
        peers = await fetchPeers(selected.symbol, data.profile.sector, data.profile.industry);
      } catch {
        // Peer fetch failed — fall through to direct briefing
      }

      if (peers.length > 0) {
        // Show peer selection while briefing generates in background
        dispatch({ type: 'SET_AVAILABLE_PEERS', peers, promptData: data.promptData });

        // Wait for briefing in background, then set strategic ideas when ready
        briefingPromise.then((briefing) => {
          const allHighlights = [...highlights, ...(briefing.highlights ?? [])];
          dispatch({ type: 'SET_STRATEGIC_IDEAS', ideas: briefing.ideas, highlights: allHighlights, revenueSegments, competitorProfiles, promptData: data.promptData });
        }).catch((err) => {
          console.error('Background briefing generation failed:', err);
        });
      } else {
        // No peers available — go straight to briefing flow
        const briefing = await briefingPromise;
        const allHighlights = [...highlights, ...(briefing.highlights ?? [])];
        dispatch({ type: 'SET_STRATEGIC_IDEAS', ideas: briefing.ideas, highlights: allHighlights, revenueSegments, competitorProfiles, promptData: data.promptData });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze company');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-heading tracking-tight">
            Corp Dev Companion
          </h1>
          <p className="text-muted mt-2 text-sm">
            M&A Target Prioritization
          </p>
        </div>

        <div className="bg-surface-card rounded-xl shadow-lg border border-edge p-8">
          {!loading ? (
            <>
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-heading">Company</h2>
                <div className="mt-3 inline-flex items-center gap-3 px-5 py-4 bg-surface-elevated rounded-lg border border-edge">
                  <img src={selected.logo} alt="" className="w-10 h-10 rounded object-contain bg-white p-0.5" />
                  <div className="text-left">
                    <p className="font-semibold text-heading">{selected.name}</p>
                    <p className="text-xs text-muted">NYSE: {selected.symbol}</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleStart}
                size="lg"
                className="w-full"
              >
                Start M&A Analysis
              </Button>

              {error && (
                <p className="text-negative text-sm text-center mt-3">{error}</p>
              )}

              <div className="mt-6 pt-6 border-t border-edge">
                <h3 className="text-sm font-medium text-body mb-2">How it works</h3>
                <ol className="text-sm text-muted space-y-1 list-decimal list-inside">
                  <li>We ingest financials, earnings calls, and analyst data</li>
                  <li>Vote on strategic priorities to establish M&A direction</li>
                  <li>AI generates market segments and product categories to compare</li>
                  <li>Vote to narrow down the most promising areas</li>
                  <li>AI generates specific company targets for final ranking</li>
                </ol>
              </div>

              <div className="mt-4 pt-4 border-t border-edge text-center">
                <a
                  href="#mockup"
                  className="text-xs text-[#f97316] hover:text-[#fb923c] underline underline-offset-2 transition-colors"
                >
                  View Briefing Design Mockup
                </a>
              </div>
            </>
          ) : (
            <div className="py-2">
              <div className="flex items-center gap-3 mb-6">
                <img src={selected.logo} alt="" className="w-8 h-8 rounded object-contain bg-white p-0.5" />
                <div>
                  <p className="font-semibold text-heading text-sm">{selected.name}</p>
                  <p className="text-xs text-muted">Gathering intelligence...</p>
                </div>
              </div>

              <div className="space-y-3">
                {DATA_STEPS.map((step, i) => {
                  const isActive = i === activeStep;
                  const isDone = i < activeStep;
                  const isPending = i > activeStep;

                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 transition-all duration-300 ${
                        isPending ? 'opacity-30' : 'opacity-100'
                      }`}
                    >
                      <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                        {isDone ? (
                          <svg className="w-5 h-5 text-positive" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : isActive ? (
                          <Spinner size="sm" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-dimmed" />
                        )}
                      </div>
                      <span className={`text-sm ${
                        isActive ? 'text-heading font-medium' :
                        isDone ? 'text-positive' :
                        'text-dimmed'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-dimmed text-center mt-6">
                Ingesting financial history, management commentary & analyst consensus to build strategic context...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
