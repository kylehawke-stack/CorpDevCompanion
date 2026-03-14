import { useState, useRef, useEffect, useCallback } from 'react';
import { useGameState } from '../context/GameStateContext.tsx';
import { fetchPeerData, generateCompetitive, searchCompany, type CompanySearchResult } from '../lib/api.ts';
import { Button } from '../components/ui/Button.tsx';
import { Spinner } from '../components/ui/Spinner.tsx';
import { fetchCrowdPeers, recordPeerSelections, mergePeerLists, type CrowdPeer } from '../lib/crowdPeers.ts';
import type { PeerCompany } from '../types/index.ts';

function formatMarketCap(mc: number): string {
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(1)}B`;
  if (mc >= 1e6) return `$${(mc / 1e6).toFixed(0)}M`;
  return `$${(mc / 1e3).toFixed(0)}K`;
}

export function PeerSelectionPage() {
  const { state, dispatch, getBriefingPromise } = useGameState();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error] = useState<string | null>(null);

  // Typeahead state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [customPeers, setCustomPeers] = useState<PeerCompany[]>([]);
  const [crowdPeers, setCrowdPeers] = useState<CrowdPeer[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const peers = state.availablePeers;
  const { merged: allPeers } = mergePeerLists(peers, crowdPeers, customPeers);

  // Fetch crowd peers on mount
  useEffect(() => {
    const symbol = state.companyProfile?.symbol;
    if (!symbol) return;
    fetchCrowdPeers(symbol).then(setCrowdPeers).catch(() => {});
  }, [state.companyProfile?.symbol]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchCompany(value.trim());
      // Filter out companies already in the peer list
      const existingSymbols = new Set(allPeers.map(p => p.symbol));
      const filtered = results.filter(r => !existingSymbols.has(r.symbol));
      setSearchResults(filtered);
      setShowDropdown(filtered.length > 0);
      setSearchLoading(false);
    }, 300);
  }, [allPeers]);

  const handleSelectSearchResult = (result: CompanySearchResult) => {
    // Add as custom peer
    const newPeer: PeerCompany = {
      symbol: result.symbol,
      name: result.name,
      marketCap: result.marketCap || 0,
      industry: '',
      logo: '',
    };
    setCustomPeers(prev => [...prev, newPeer]);
    // Auto-select it if under limit
    setSelected(prev => {
      const next = new Set(prev);
      if (next.size < 5) next.add(result.symbol);
      return next;
    });
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const togglePeer = (symbol: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else if (next.size < 5) {
        next.add(symbol);
      }
      return next;
    });
  };

  const handleSelectCompetitors = async () => {
    if (selected.size < 3) return;

    const symbols = Array.from(selected);
    dispatch({ type: 'SELECT_PEERS', symbols });

    // Navigate immediately to briefing
    dispatch({ type: 'SET_PHASE', phase: 'briefing' });

    // Fire-and-forget: record selections to crowd wisdom table
    const targetSymbol = state.companyProfile?.symbol;
    if (targetSymbol) {
      const selectedPeerData = allPeers
        .filter((p) => selected.has(p.symbol))
        .map(({ symbol, name, marketCap, industry, logo }) => ({ symbol, name, marketCap, industry, logo }));
      recordPeerSelections(targetSymbol, selectedPeerData);
    }

    // Fire-and-forget: fetch peer financial data, then generate competitive analysis
    const allSymbols = [state.companyProfile!.symbol, ...symbols];
    const promptData = state.promptData;
    fetchPeerData(allSymbols)
      .then(({ peerFinancials, competitorPromptData }) => {
        dispatch({ type: 'SET_PEER_FINANCIALS', peerFinancials, competitorPromptData });
        // Call 2: Competitive Positioning cards (always generate — peers vary)
        if (competitorPromptData && promptData) {
          generateCompetitive(promptData, competitorPromptData)
            .then(({ highlights }) => {
              dispatch({ type: 'SET_COMPETITIVE', highlights });
            })
            .catch((err) => {
              console.error('Competitive analysis failed:', err);
            });
        }
      })
      .catch((err) => {
        console.error('Background peer data fetch failed:', err);
      });

    // Fire-and-forget: ensure briefing completes (BriefingPage has its own retry)
    const briefingPromise = getBriefingPromise();
    if (briefingPromise && state.ideas.length === 0) {
      briefingPromise.catch(() => {
        // BriefingPage will handle retry
      });
    }
  };

  const handleSkip = () => {
    dispatch({ type: 'SET_PHASE', phase: 'briefing' });
  };

  return (
    <div className="min-h-screen bg-surface-base py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-heading">Select Competitors</h1>
          <p className="text-sm text-muted mt-2">
            Choose 3-5 peer companies to benchmark against. We'll compare financial performance before diving into strategic analysis.
          </p>
        </div>

        {error && (
          <div className="bg-negative/10 border border-negative/30 rounded-lg p-3 mb-4 text-sm text-negative text-center">
            {error}
          </div>
        )}

        <div className="mb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allPeers.map((peer) => {
              const isSelected = selected.has(peer.symbol);
              return (
                <PeerCard
                  key={peer.symbol}
                  peer={peer}
                  isSelected={isSelected}
                  onToggle={togglePeer}
                  selectionCount={peer.selectionCount}
                />
              );
            })}
          </div>
        </div>

        {/* Typeahead: Add Other Competitor */}
        <div ref={searchRef} className="relative mb-8">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                placeholder="Add another company by name or ticker..."
                className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-edge bg-surface-card text-sm text-heading placeholder:text-dimmed focus:outline-none focus:border-accent transition-colors"
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-surface-card border border-edge rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.symbol}
                  onClick={() => handleSelectSearchResult(result)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/10 transition-colors text-left border-b border-edge last:border-b-0"
                >
                  <div className="w-8 h-8 rounded bg-surface-elevated shrink-0 flex items-center justify-center text-xs font-bold text-muted">
                    {result.symbol.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-heading truncate">{result.name}</p>
                    <p className="text-xs text-muted">{result.symbol} &middot; {result.exchange}</p>
                  </div>
                  <div className="ml-auto shrink-0">
                    <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-center space-y-3">
          <Button
            onClick={handleSelectCompetitors}
            disabled={selected.size < 3}
            size="lg"
            className="px-10"
          >
            Step 1: View Company Analysis
          </Button>
          <div>
            <button
              onClick={handleSkip}
              className="text-sm text-muted hover:text-accent underline"
            >
              Skip peer analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PeerCard({
  peer,
  isSelected,
  onToggle,
  selectionCount,
}: {
  peer: PeerCompany;
  isSelected: boolean;
  onToggle: (symbol: string) => void;
  selectionCount?: number;
}) {
  return (
    <button
      onClick={() => onToggle(peer.symbol)}
      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${
        isSelected
          ? 'border-accent bg-accent/10 shadow-md'
          : 'border-edge bg-surface-card hover:border-edge-light hover:shadow-sm'
      }`}
    >
      {peer.logo ? (
        <img
          src={peer.logo}
          alt=""
          className="w-8 h-8 rounded object-contain shrink-0 bg-white p-0.5"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="w-8 h-8 rounded bg-surface-elevated shrink-0 flex items-center justify-center text-xs font-bold text-muted">
          {peer.symbol.slice(0, 2)}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-heading truncate">{peer.name}</p>
        <p className="text-xs text-muted">
          {peer.symbol}
          {peer.marketCap > 0 && <> &middot; Mkt Cap: {formatMarketCap(peer.marketCap)}</>}
          {selectionCount != null && selectionCount > 1 && (
            <span className="inline-flex items-center gap-0.5 ml-1.5 text-accent/70">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {selectionCount}
            </span>
          )}
        </p>
      </div>
      {isSelected && (
        <div className="ml-auto shrink-0">
          <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </button>
  );
}
