import type { RankedIdea } from '../../types/index.ts';
import { computeSpectrums } from '../../lib/spectrumComputation.ts';
import { useMemo } from 'react';

interface SpectrumResultsProps {
  rankings: RankedIdea[];
}

export function SpectrumResults({ rankings }: SpectrumResultsProps) {
  const spectrums = useMemo(() => computeSpectrums(rankings), [rankings]);

  if (spectrums.length === 0) {
    return <p className="text-muted text-center py-8">No dimension data available.</p>;
  }

  return (
    <div className="space-y-4">
      {spectrums.map((s) => {
        const attrCount = s.attributes.length;
        const maxIdx = Math.max(...s.attributes.map(a => a.dimensionIndex), 1);

        return (
          <div
            key={s.dimension}
            className="bg-surface-card rounded-xl border border-edge shadow-sm p-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-accent bg-accent/15 rounded-full w-6 h-6 flex items-center justify-center">
                  {s.importanceRank}
                </span>
                <h3 className="text-sm font-semibold text-heading">{s.dimension}</h3>
              </div>
              <span className="text-xs text-dimmed">
                Avg score: {Math.round(s.importance)}
              </span>
            </div>

            {/* Spectrum line */}
            <div className="relative mx-2 mt-2 mb-6">
              {/* Labels */}
              <div className="flex justify-between text-[10px] text-dimmed mb-2">
                <span>Conservative</span>
                <span>Aggressive</span>
              </div>

              {/* Line */}
              <div className="relative h-6">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-edge -translate-y-1/2" />

                {/* Attribute dots (gray) */}
                {s.attributes.map((attr) => {
                  const pct = attrCount <= 1 ? 50 : (attr.dimensionIndex / maxIdx) * 100;
                  return (
                    <div
                      key={attr.title}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                      style={{ left: `${pct}%` }}
                      title={`${attr.title} (Score: ${attr.displayScore})`}
                    >
                      <div className="w-3 h-3 rounded-full bg-dimmed border-2 border-surface-card" />
                    </div>
                  );
                })}

                {/* User position (accent) */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                  style={{ left: `${s.position * 100}%` }}
                  title="Your weighted position"
                >
                  <div className="w-4 h-4 rounded-full bg-accent border-2 border-surface-card shadow-md" />
                </div>
              </div>

              {/* Attribute labels below */}
              <div className="relative h-8 mt-1">
                {s.attributes.map((attr) => {
                  const pct = attrCount <= 1 ? 50 : (attr.dimensionIndex / maxIdx) * 100;
                  return (
                    <div
                      key={attr.title}
                      className="absolute -translate-x-1/2 text-[10px] text-muted leading-tight text-center max-w-[80px]"
                      style={{ left: `${pct}%` }}
                    >
                      {attr.title}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
