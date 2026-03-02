import type { Tier } from '../types/index.ts';

// Adjacency matrix: which tiers can be paired together
// Strategic Priority <-> Strategic Priority: YES (only pairs with itself)
// Market Segment <-> Product Category: YES
// Product Category <-> Specific Company: YES
// Market Segment <-> Specific Company: NO
const ADJACENCY_MATRIX: Record<Tier, Record<Tier, boolean>> = {
  strategic_priority: {
    strategic_priority: true,
    market_segment: false,
    product_category: false,
    specific_company: false,
  },
  market_segment: {
    strategic_priority: false,
    market_segment: true,
    product_category: true,
    specific_company: false,
  },
  product_category: {
    strategic_priority: false,
    market_segment: true,
    product_category: true,
    specific_company: true,
  },
  specific_company: {
    strategic_priority: false,
    market_segment: false,
    product_category: true,
    specific_company: true,
  },
};

export function canPair(tierA: Tier, tierB: Tier): boolean {
  return ADJACENCY_MATRIX[tierA][tierB];
}

export function getCompatibleTiers(tier: Tier): Tier[] {
  return (Object.keys(ADJACENCY_MATRIX[tier]) as Tier[]).filter(
    (t) => ADJACENCY_MATRIX[tier][t]
  );
}
