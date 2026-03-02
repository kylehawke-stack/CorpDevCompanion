import { useState } from 'react';
import type { RankedIdea } from '../../types/index.ts';
import { Badge } from '../ui/Badge.tsx';

function HeaderTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((s) => !s)}
        className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-elevated text-muted text-[10px] font-bold leading-none hover:bg-surface-hover cursor-help"
      >
        ?
      </button>
      {show && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-2.5 bg-surface-elevated text-body text-xs rounded-lg shadow-lg text-left leading-relaxed whitespace-normal border border-edge">
          {text}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-surface-elevated" />
        </div>
      )}
    </span>
  );
}

interface RankingTableProps {
  rankings: RankedIdea[];
}

export function RankingTable({ rankings }: RankingTableProps) {
  if (rankings.length === 0) {
    return <p className="text-muted text-center py-8">No rankings yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-edge">
            <th className="text-left py-3 px-4 font-medium text-muted bg-surface-elevated w-12">#</th>
            <th className="text-left py-3 px-4 font-medium text-muted bg-surface-elevated">Opportunity</th>
            <th className="text-left py-3 px-4 font-medium text-muted bg-surface-elevated w-32">Tier</th>
            <th className="text-right py-3 px-4 font-medium text-muted bg-surface-elevated w-24">
              Score
              <HeaderTooltip text="Bradley-Terry strength displayed as an Elo-equivalent rating. Median score is 1500. Higher = stronger preference from the team's pairwise voting across all steps." />
            </th>
            <th className="text-right py-3 px-4 font-medium text-muted bg-surface-elevated w-24">
              W-L
              <HeaderTooltip text="Total wins and losses from all pairwise comparisons across every voting step. More matchups = more reliable ranking." />
            </th>
            <th className="text-center py-3 px-4 font-medium text-muted bg-surface-elevated w-36">
              95% CI
              <HeaderTooltip text="95% Confidence Interval — the range where this opportunity's true score likely falls. Narrower = more certain. Wider = needs more votes to pin down." />
            </th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((r, i) => (
            <tr
              key={r.idea.id}
              className={`border-b border-edge hover:bg-surface-hover transition-colors ${
                i < 3 ? 'bg-accent/10' : ''
              }`}
            >
              <td className="py-3 px-4">
                <span className={`font-bold ${i < 3 ? 'text-accent' : 'text-dimmed'}`}>
                  {r.rank}
                </span>
              </td>
              <td className="py-3 px-4">
                <div>
                  <span className="font-medium text-heading">{r.idea.title}</span>
                  <p className="text-xs text-muted mt-0.5 line-clamp-1">
                    {r.idea.blurb[0] ?? ''}
                  </p>
                </div>
              </td>
              <td className="py-3 px-4">
                <Badge tier={r.idea.tier} dimensionLabel={r.idea.dimension} linkedTheme={r.idea.linkedTheme} />
              </td>
              <td className="py-3 px-4 text-right font-mono font-semibold text-heading">
                {r.displayScore}
              </td>
              <td className="py-3 px-4 text-right font-mono text-body">
                {r.wins}-{r.losses}
              </td>
              <td className="py-3 px-4 text-center font-mono text-xs text-muted">
                {r.confidenceInterval.lower}–{r.confidenceInterval.upper}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
