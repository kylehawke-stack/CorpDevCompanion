import { useState } from 'react';
import type { RankedIdea } from '../../types/index.ts';
import { generateNarrative } from '../../lib/api.ts';
import { Button } from '../ui/Button.tsx';
import { Spinner } from '../ui/Spinner.tsx';
import { Card } from '../ui/Card.tsx';

interface StrategicNarrativeProps {
  rankings: RankedIdea[];
  totalVotes: number;
  sessionName: string;
  promptData?: string;
  competitorPromptData?: string;
}

export function StrategicNarrative({ rankings, totalVotes, sessionName, promptData, competitorPromptData }: StrategicNarrativeProps) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [presentationOutline, setPresentationOutline] = useState<string | null>(null);
  const [showOutline, setShowOutline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateNarrative(rankings, totalVotes, sessionName, promptData, competitorPromptData);
      setNarrative(result.narrative);
      setPresentationOutline(result.presentationOutline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate narrative');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOutline = () => {
    if (presentationOutline) {
      navigator.clipboard.writeText(presentationOutline);
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
    <div className="flex flex-col gap-4">
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

      {presentationOutline && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-heading">PowerPoint Presentation Outline</h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCopyOutline}>
                Copy to Clipboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowOutline(!showOutline)}>
                {showOutline ? 'Hide' : 'Show'}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted mb-3">
            Copy this outline and paste it into the Claude PowerPoint plugin to generate a presentation deck.
          </p>
          {showOutline && (
            <pre className="text-sm text-body bg-surface-alt p-4 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
              {presentationOutline}
            </pre>
          )}
        </Card>
      )}
    </div>
  );
}
