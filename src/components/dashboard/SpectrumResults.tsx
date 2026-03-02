import type { RankedIdea } from '../../types/index.ts';
import { DIMENSION_METADATA } from '../../types/index.ts';
import { computeSpectrums, type DimensionSpectrum } from '../../lib/spectrumComputation.ts';
import { useMemo } from 'react';

interface SpectrumResultsProps {
  rankings: RankedIdea[];
}

// ── Rank Badge ──

function RankBadge({ rank }: { rank: number }) {
  const isTop = rank <= 3;
  return (
    <span
      className={`
        inline-flex items-center justify-center w-8 h-8 rounded-lg font-mono text-sm font-bold shrink-0
        ${isTop
          ? 'bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/30'
          : 'bg-[#1e293b] text-[#94a3b8] border border-[#2a3a4e]'
        }
      `}
    >
      {rank}
    </span>
  );
}

// ── Segmented Bar ──

function SegmentedBar({ spectrum }: { spectrum: DimensionSpectrum }) {
  const segments = spectrum.attributes;
  const posPercent = spectrum.position * 100;

  // Which segment does the position fall in?
  const activeIdx = Math.min(
    Math.floor(spectrum.position * segments.length),
    segments.length - 1
  );

  // Get dimension-specific axis labels
  const meta = DIMENSION_METADATA[spectrum.dimension];
  const leftLabel = meta?.leftLabel || '';
  const rightLabel = meta?.rightLabel || '';

  return (
    <div className="mt-4">
      {/* Axis labels */}
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between mb-2">
          <span className="text-[11px] text-[#94a3b8]">{leftLabel}</span>
          <span className="text-[11px] text-[#94a3b8]">{rightLabel}</span>
        </div>
      )}

      {/* Segmented bar with position marker */}
      <div className="relative">
        <div className="flex rounded-lg overflow-hidden border border-[#2a3a4e]">
          {segments.map((seg, i) => {
            const isActive = i === activeIdx;
            return (
              <div
                key={seg.title}
                className="flex items-center justify-center border-r border-[#2a3a4e] last:border-r-0"
                style={{
                  flex: 1,
                  height: '44px',
                  backgroundColor: isActive
                    ? 'rgba(249, 115, 22, 0.12)'
                    : 'rgba(15, 20, 25, 0.6)',
                }}
              >
                <span
                  className={`text-[11px] font-medium px-1.5 text-center leading-tight ${
                    isActive ? 'text-[#f97316]' : 'text-[#94a3b8]'
                  }`}
                >
                  {seg.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Orange position dot */}
        <div
          className="absolute top-0 pointer-events-none flex items-center justify-center"
          style={{
            left: `${posPercent}%`,
            transform: 'translateX(-50%)',
            height: '44px',
          }}
        >
          <div
            className="w-3.5 h-3.5 rounded-full bg-[#f97316] border-2 border-[#0f1419]"
            style={{ boxShadow: '0 0 10px rgba(249, 115, 22, 0.6)' }}
          />
        </div>

        {/* Triangle pointer below the bar */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${posPercent}%`,
            transform: 'translateX(-50%)',
            top: '44px',
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #f97316',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Dimension Card ──

function DimensionCard({ spectrum }: { spectrum: DimensionSpectrum }) {
  const isTop = spectrum.importanceRank <= 2;
  const meta = DIMENSION_METADATA[spectrum.dimension];
  const description = meta?.description || '';

  return (
    <div
      className={`bg-[#1a2332] rounded-xl border p-6 ${
        isTop ? 'border-[#f97316]/25' : 'border-[#2a3a4e]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <RankBadge rank={spectrum.importanceRank} />
          <div>
            <h3 className="text-[#e2e8f0] font-semibold text-lg leading-tight">
              {spectrum.dimension}
            </h3>
            {description && (
              <p className="text-[13px] text-[#94a3b8] mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-sm text-[#e2e8f0]">
            {Math.round(spectrum.importance)}
          </p>
          <p className="text-[10px] text-[#64748b] uppercase tracking-wider">
            score
          </p>
        </div>
      </div>

      <SegmentedBar spectrum={spectrum} />
    </div>
  );
}

// ── Main Component ──

export function SpectrumResults({ rankings }: SpectrumResultsProps) {
  const spectrums = useMemo(() => computeSpectrums(rankings), [rankings]);

  if (spectrums.length === 0) {
    return <p className="text-[#64748b] text-center py-8">No dimension data available.</p>;
  }

  return (
    <div className="space-y-4">
      {spectrums.map((s) => (
        <DimensionCard key={s.dimension} spectrum={s} />
      ))}
    </div>
  );
}
