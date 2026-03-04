import { useState } from 'react';
import { useGameState } from '../context/GameStateContext.tsx';
import { Button } from '../components/ui/Button.tsx';

const COMPANIES = [
  { symbol: 'HBB', name: 'Hamilton Beach Brands', logo: 'https://images.financialmodelingprep.com/symbol/HBB.png' },
  { symbol: 'TTNDY', name: 'Techtronic Industries', logo: 'https://images.financialmodelingprep.com/symbol/TTNDY.png' },
  { symbol: 'TREX', name: 'Trex Company', logo: 'https://images.financialmodelingprep.com/symbol/TREX.png' },
  { symbol: 'PNR', name: 'Pentair', logo: 'https://images.financialmodelingprep.com/symbol/PNR.png' },
];

export function WelcomePage() {
  const { dispatch } = useGameState();
  const [error, setError] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = COMPANIES[selectedIdx];

  const handleStart = () => {
    setError(null);
    // Set the company profile and move to how_it_works phase.
    // The HowItWorksPage will kick off FMP fetches in the background.
    dispatch({
      type: 'START_ANALYSIS',
      companyProfile: {
        symbol: selected.symbol,
        companyName: selected.name,
        description: '',
        marketCap: 0,
        price: 0,
        sector: '',
        industry: '',
        ceo: '',
        fullTimeEmployees: '',
        website: '',
        image: selected.logo,
        country: '',
      },
    });
    dispatch({ type: 'SET_PHASE', phase: 'how_it_works' });
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
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-heading text-center mb-3">Select a Company</h2>
            <div className="grid grid-cols-2 gap-3">
              {COMPANIES.map((co, i) => (
                <button
                  key={co.symbol}
                  onClick={() => setSelectedIdx(i)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                    i === selectedIdx
                      ? 'border-accent bg-accent/5'
                      : 'border-edge bg-surface-elevated hover:border-muted'
                  }`}
                >
                  <img src={co.logo} alt="" className="w-9 h-9 rounded object-contain bg-white p-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-heading text-sm leading-tight truncate">{co.name}</p>
                    <p className="text-xs text-muted">{co.symbol}</p>
                  </div>
                </button>
              ))}
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
        </div>
      </div>
    </div>
  );
}
