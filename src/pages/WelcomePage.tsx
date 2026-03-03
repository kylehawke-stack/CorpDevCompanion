import { useState } from 'react';
import { useGameState } from '../context/GameStateContext.tsx';
import { Button } from '../components/ui/Button.tsx';

const COMPANIES = [
  { symbol: 'HBB', name: 'Hamilton Beach Brands', logo: 'https://images.financialmodelingprep.com/symbol/HBB.png' },
];

export function WelcomePage() {
  const { dispatch } = useGameState();
  const [error, setError] = useState<string | null>(null);
  const selected = COMPANIES[0]; // Only HBB for now

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
        </div>
      </div>
    </div>
  );
}
