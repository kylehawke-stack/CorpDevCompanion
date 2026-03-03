import { useState, useEffect } from 'react';
import { GameStateProvider, useGameState } from './context/GameStateContext.tsx';
import { WelcomePage } from './pages/WelcomePage.tsx';
import { PeerSelectionPage } from './pages/PeerSelectionPage.tsx';
import { PeerBenchmarkPage } from './pages/PeerBenchmarkPage.tsx';
import { BriefingPage } from './pages/BriefingPage.tsx';
import { VotePage } from './pages/VotePage.tsx';
import { TransitionPage } from './pages/TransitionPage.tsx';
import { ResultsPage } from './pages/ResultsPage.tsx';
import { BriefingMockup } from './pages/BriefingMockup.tsx';
import { ResultsMockup } from './pages/ResultsMockup.tsx';
import { SpectrumComparison } from './pages/SpectrumComparison.tsx';
import { PeerBenchmarkMockup } from './pages/PeerBenchmarkMockup.tsx';
import { VotingIntroMockup } from './pages/VotingIntroMockup.tsx';
import { HowItWorksMockup } from './pages/HowItWorksMockup.tsx';
import { TrackerDemoMockup } from './pages/TrackerDemoMockup.tsx';

function AppRouter() {
  const { state } = useGameState();
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Show mockups when navigating to hash routes
  if (hash === '#mockup') return <BriefingMockup />;
  if (hash === '#results-mockup') return <ResultsMockup />;
  if (hash === '#spectrum-compare') return <SpectrumComparison />;
  if (hash === '#peer-mockup') return <PeerBenchmarkMockup />;
  if (hash === '#voting-intro') return <VotingIntroMockup />;
  if (hash === '#how-it-works') return <HowItWorksMockup />;
  if (hash === '#tracker-demo') return <TrackerDemoMockup />;

  switch (state.phase) {
    case 'welcome':
      return <WelcomePage />;
    case 'analyzing':
      return <WelcomePage />;
    case 'peer_selection':
      return <PeerSelectionPage />;
    case 'peer_benchmarking':
      return <PeerBenchmarkPage />;
    case 'briefing':
      return <BriefingPage />;
    case 'voting_step1':
    case 'voting_step2':
    case 'voting_step3':
      return <VotePage />;
    case 'transition1':
    case 'transition2':
      return <TransitionPage />;
    case 'results':
      return <ResultsPage />;
  }
}

export default function App() {
  return (
    <GameStateProvider>
      <AppRouter />
    </GameStateProvider>
  );
}
