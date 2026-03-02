import type { Tier } from '../../types/index.ts';

type FilterOption = Tier | 'all';

interface TierFilterProps {
  selected: FilterOption;
  onChange: (filter: FilterOption) => void;
}

const options: { value: FilterOption; label: string; activeColor: string }[] = [
  { value: 'all', label: 'All Tiers', activeColor: 'bg-surface-hover text-heading border-edge-light' },
  { value: 'strategic_priority', label: 'Strategic Priorities', activeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  { value: 'market_segment', label: 'Market Segments', activeColor: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  { value: 'product_category', label: 'Product Categories', activeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { value: 'specific_company', label: 'Specific Companies', activeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
];

export function TierFilter({ selected, onChange }: TierFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            selected === opt.value
              ? `${opt.activeColor} ring-2 ring-offset-1 ring-offset-surface-base ring-accent`
              : 'bg-surface-elevated text-muted border-edge hover:bg-surface-hover'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export type { FilterOption };
