import type { Tier } from '../../types/index.ts';

type FilterOption = Tier | 'all';

interface TierFilterProps {
  selected: FilterOption;
  onChange: (filter: FilterOption) => void;
}

const options: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'All Tiers' },
  { value: 'strategic_priority', label: 'Strategic Priorities' },
  { value: 'market_segment', label: 'Market Segments' },
  { value: 'product_category', label: 'Product Categories' },
  { value: 'specific_company', label: 'Specific Companies' },
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
              ? 'bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30'
              : 'bg-[#1e293b] text-[#94a3b8] border-[#2a3a4e] hover:border-[#475569]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export type { FilterOption };
