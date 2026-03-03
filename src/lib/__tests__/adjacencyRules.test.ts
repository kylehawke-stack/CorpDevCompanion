import { describe, it, expect } from 'vitest';
import { canPair, getCompatibleTiers } from '../adjacencyRules.ts';
import type { Tier } from '../../types/index.ts';

const ALL_TIERS: Tier[] = ['strategic_priority', 'market_segment', 'product_category', 'specific_company'];

describe('canPair', () => {
  // Strategic Priority: only pairs with itself
  it('strategic_priority pairs with strategic_priority', () => {
    expect(canPair('strategic_priority', 'strategic_priority')).toBe(true);
  });
  it('strategic_priority does NOT pair with market_segment', () => {
    expect(canPair('strategic_priority', 'market_segment')).toBe(false);
  });
  it('strategic_priority does NOT pair with product_category', () => {
    expect(canPair('strategic_priority', 'product_category')).toBe(false);
  });
  it('strategic_priority does NOT pair with specific_company', () => {
    expect(canPair('strategic_priority', 'specific_company')).toBe(false);
  });

  // Market Segment: pairs with itself and product_category
  it('market_segment pairs with market_segment', () => {
    expect(canPair('market_segment', 'market_segment')).toBe(true);
  });
  it('market_segment pairs with product_category', () => {
    expect(canPair('market_segment', 'product_category')).toBe(true);
  });
  it('market_segment does NOT pair with specific_company', () => {
    expect(canPair('market_segment', 'specific_company')).toBe(false);
  });

  // Product Category: pairs with market_segment, itself, specific_company
  it('product_category pairs with product_category', () => {
    expect(canPair('product_category', 'product_category')).toBe(true);
  });
  it('product_category pairs with specific_company', () => {
    expect(canPair('product_category', 'specific_company')).toBe(true);
  });

  // Specific Company: pairs with product_category and itself
  it('specific_company pairs with specific_company', () => {
    expect(canPair('specific_company', 'specific_company')).toBe(true);
  });

  // Symmetry: canPair(a, b) === canPair(b, a) for all tier combinations
  it('is symmetric for all tier pairs', () => {
    for (const a of ALL_TIERS) {
      for (const b of ALL_TIERS) {
        expect(canPair(a, b)).toBe(canPair(b, a));
      }
    }
  });
});

describe('getCompatibleTiers', () => {
  it('strategic_priority is only compatible with itself', () => {
    expect(getCompatibleTiers('strategic_priority')).toEqual(['strategic_priority']);
  });

  it('market_segment is compatible with market_segment and product_category', () => {
    expect(getCompatibleTiers('market_segment')).toEqual(['market_segment', 'product_category']);
  });

  it('product_category is compatible with market_segment, product_category, specific_company', () => {
    expect(getCompatibleTiers('product_category')).toEqual([
      'market_segment',
      'product_category',
      'specific_company',
    ]);
  });

  it('specific_company is compatible with product_category and specific_company', () => {
    expect(getCompatibleTiers('specific_company')).toEqual(['product_category', 'specific_company']);
  });
});
