import type { Tier } from '../../types/index.ts';

const tierStyles: Record<Tier, string> = {
  strategic_priority: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  market_segment: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  product_category: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  specific_company: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};

const tierLabels: Record<Tier, string> = {
  strategic_priority: 'Strategic Priority',
  market_segment: 'Market Segment',
  product_category: 'Product Category',
  specific_company: 'Specific Company',
};

interface BadgeProps {
  tier: Tier;
  className?: string;
  dimensionLabel?: string;
  linkedTheme?: string;
}

export function Badge({ tier, className = '', dimensionLabel, linkedTheme }: BadgeProps) {
  let label = tierLabels[tier];
  if (tier === 'strategic_priority' && dimensionLabel) {
    label = dimensionLabel;
  } else if (tier === 'specific_company' && linkedTheme) {
    label = linkedTheme;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${tierStyles[tier]} ${className}`}
    >
      {label}
    </span>
  );
}
