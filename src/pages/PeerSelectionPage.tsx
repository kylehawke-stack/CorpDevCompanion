import { useState } from 'react';
import { useGameState } from '../context/GameStateContext.tsx';
import { fetchPeerData } from '../lib/api.ts';
import { Button } from '../components/ui/Button.tsx';
import { Spinner } from '../components/ui/Spinner.tsx';

function formatMarketCap(mc: number): string {
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(1)}B`;
  if (mc >= 1e6) return `$${(mc / 1e6).toFixed(0)}M`;
  return `$${(mc / 1e3).toFixed(0)}K`;
}

export function PeerSelectionPage() {
  const { state, dispatch } = useGameState();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peers = state.availablePeers;

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
    setLoading(true);
    setError(null);

    const symbols = Array.from(selected);
    dispatch({ type: 'SELECT_PEERS', symbols });

    try {
      // Include the target company in the comparison
      const allSymbols = [state.companyProfile!.symbol, ...symbols];
      const { peerFinancials, competitorPromptData } = await fetchPeerData(allSymbols);
      dispatch({ type: 'SET_PEER_FINANCIALS', peerFinancials, competitorPromptData });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch peer data');
      setLoading(false);
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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          {peers.map((peer) => {
            const isSelected = selected.has(peer.symbol);
            return (
              <button
                key={peer.symbol}
                onClick={() => togglePeer(peer.symbol)}
                disabled={loading}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-accent bg-accent/10 shadow-md'
                    : 'border-edge bg-surface-card hover:border-edge-light hover:shadow-sm'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                  <p className="text-xs text-muted">{peer.symbol} &middot; Mkt Cap: {formatMarketCap(peer.marketCap)}</p>
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
          })}
        </div>

        {loading ? (
          <div className="bg-surface-card rounded-xl shadow-lg border border-edge p-8 text-center">
            <Spinner size="lg" />
            <p className="text-sm text-body font-medium mt-4">
              Fetching financial data for {selected.size} competitors...
            </p>
            <p className="text-xs text-dimmed mt-1">
              Pulling income statements and market data for benchmarking
            </p>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <Button
              onClick={handleSelectCompetitors}
              disabled={selected.size < 3}
              size="lg"
              className="px-10"
            >
              Select Competitors ({selected.size}/3-5)
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
        )}
      </div>
    </div>
  );
}
