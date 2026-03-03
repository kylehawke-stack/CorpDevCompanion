import { useState } from 'react';
import type { RankedIdea, StrategicContext } from '../../types/index.ts';
import { generateNarrative } from '../../lib/api.ts';
import { Button } from '../ui/Button.tsx';
import { Spinner } from '../ui/Spinner.tsx';
import { Card } from '../ui/Card.tsx';

interface StrategicNarrativeProps {
  rankings: RankedIdea[];
  totalVotes: number;
  sessionName: string;
  strategicContext?: StrategicContext;
}

export function StrategicNarrative({ rankings, totalVotes, sessionName, strategicContext }: StrategicNarrativeProps) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateNarrative(rankings, totalVotes, sessionName, strategicContext);
      setNarrative(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate narrative');
    } finally {
      setLoading(false);
    }
  };

  if (!narrative && !loading) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted mb-3">
          Generate a strategic briefing based on the voting results.
        </p>
        <Button onClick={handleGenerate} disabled={rankings.length === 0}>
          Generate Strategic Briefing
        </Button>
        {error && <p className="text-negative text-sm mt-2">{error}</p>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center py-12 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-muted">Analyzing voting patterns and generating briefing...</p>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-heading">Strategic Briefing</h3>
        <Button variant="ghost" size="sm" onClick={handleGenerate}>
          Regenerate
        </Button>
      </div>
      <div className="prose prose-sm max-w-none">
        {narrative!.split('\n\n').map((paragraph, i) => (
          <p key={i} className="text-body leading-relaxed mb-3">
            {paragraph}
          </p>
        ))}
      </div>
    </Card>
  );
}
