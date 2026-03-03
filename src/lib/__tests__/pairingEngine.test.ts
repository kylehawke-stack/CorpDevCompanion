import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { selectPair } from '../pairingEngine.ts';
import type { Idea, Vote } from '../../types/index.ts';

function makeIdea(id: string, tier: Idea['tier'] = 'strategic_priority'): Idea {
  return {
    id,
    title: `Idea ${id}`,
    tier,
    blurb: [],
    source: 'seed',
    createdAt: Date.now(),
  };
}

function makeVote(winnerId: string, loserId: string, skipped = false): Vote {
  return {
    id: `vote-${winnerId}-${loserId}-${Math.random()}`,
    voterId: 'test-voter',
    winnerId,
    loserId,
    skipped,
    timestamp: Date.now(),
  };
}

describe('selectPair', () => {
  let mathRandomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Default: Math.random always returns 0.25 (triggers new item boost path when < 0.5)
    mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.25);
  });

  afterEach(() => {
    mathRandomSpy.mockRestore();
  });

  it('returns null with fewer than 2 ideas', () => {
    expect(selectPair([], [], 0)).toBeNull();
    expect(selectPair([makeIdea('a')], [], 0)).toBeNull();
  });

  it('returns a pair of two ideas', () => {
    const ideas = [makeIdea('a'), makeIdea('b')];
    const result = selectPair(ideas, [], 0, 'voting_step1');
    expect(result).not.toBeNull();
    expect(result).toHaveLength(2);
    expect(result![0].id).not.toBe(result![1].id);
  });

  // Phase filtering
  it('only returns strategic_priority ideas in voting_step1', () => {
    const ideas = [
      makeIdea('sp1', 'strategic_priority'),
      makeIdea('sp2', 'strategic_priority'),
      makeIdea('ms1', 'market_segment'),
      makeIdea('pc1', 'product_category'),
    ];
    // Run multiple times to check consistency
    for (let i = 0; i < 20; i++) {
      mathRandomSpy.mockReturnValue(i / 20);
      const result = selectPair(ideas, [], 0, 'voting_step1');
      if (result) {
        expect(result[0].tier).toBe('strategic_priority');
        expect(result[1].tier).toBe('strategic_priority');
      }
    }
  });

  it('only returns market_segment/product_category ideas in voting_step2', () => {
    const ideas = [
      makeIdea('sp1', 'strategic_priority'),
      makeIdea('ms1', 'market_segment'),
      makeIdea('ms2', 'market_segment'),
      makeIdea('pc1', 'product_category'),
    ];
    for (let i = 0; i < 20; i++) {
      mathRandomSpy.mockReturnValue(i / 20);
      const result = selectPair(ideas, [], 0, 'voting_step2');
      if (result) {
        expect(result[0].tier).not.toBe('strategic_priority');
        expect(result[1].tier).not.toBe('strategic_priority');
        expect(result[0].tier).not.toBe('specific_company');
        expect(result[1].tier).not.toBe('specific_company');
      }
    }
  });

  it('includes at least one specific_company in voting_step3 pairs', () => {
    const ideas = [
      makeIdea('pc1', 'product_category'),
      makeIdea('sc1', 'specific_company'),
      makeIdea('sc2', 'specific_company'),
    ];
    for (let i = 0; i < 20; i++) {
      mathRandomSpy.mockReturnValue(i / 20);
      const result = selectPair(ideas, [], 0, 'voting_step3');
      if (result) {
        const hasCompany = result[0].tier === 'specific_company' || result[1].tier === 'specific_company';
        expect(hasCompany).toBe(true);
      }
    }
  });

  // recentItemIds exclusion — last pair should never repeat
  it('does not return the same pair as the most recent when alternatives exist', () => {
    const ideas = [
      makeIdea('a', 'strategic_priority'),
      makeIdea('b', 'strategic_priority'),
      makeIdea('c', 'strategic_priority'),
    ];
    // Last pair shown was [a, b] — passed as trailing items in recentItemIds
    const recentItemIds = ['a', 'b'];

    for (let i = 0; i < 20; i++) {
      mathRandomSpy.mockReturnValue(i / 20);
      const result = selectPair(ideas, [], 0, 'voting_step1', recentItemIds);
      if (result) {
        const ids = [result[0].id, result[1].id].sort();
        expect(ids).not.toEqual(['a', 'b']);
      }
    }
  });

  // Diversity — recently shown items should be deprioritized
  it('avoids pairing recently-shown items when fresh alternatives exist', () => {
    const ideas = Array.from({ length: 8 }, (_, i) =>
      makeIdea(`sp${i}`, 'strategic_priority')
    );
    // sp0 and sp1 were shown in the last 3 pairs
    const recentItemIds = ['sp0', 'sp1', 'sp0', 'sp2', 'sp1', 'sp3'];

    const itemCounts = new Map<string, number>();
    const trials = 200;
    for (let i = 0; i < trials; i++) {
      mathRandomSpy.mockReturnValue(i / trials);
      const result = selectPair(ideas, [], 0, 'voting_step1', recentItemIds);
      if (result) {
        itemCounts.set(result[0].id, (itemCounts.get(result[0].id) ?? 0) + 1);
        itemCounts.set(result[1].id, (itemCounts.get(result[1].id) ?? 0) + 1);
      }
    }

    // Recent items (sp0, sp1) should appear significantly less than fresh items
    const recentCount = (itemCounts.get('sp0') ?? 0) + (itemCounts.get('sp1') ?? 0);
    const freshCount = (itemCounts.get('sp4') ?? 0) + (itemCounts.get('sp5') ?? 0) +
      (itemCounts.get('sp6') ?? 0) + (itemCounts.get('sp7') ?? 0);
    // Fresh items (4 of them) should collectively appear more than recent items (2 of them)
    expect(freshCount).toBeGreaterThan(recentCount);
  });

  // Exhausted pairs → fallback
  it('falls back to re-pairing when all pairs have been voted on', () => {
    const ideas = [
      makeIdea('a', 'strategic_priority'),
      makeIdea('b', 'strategic_priority'),
    ];
    // One vote covers the only possible pair
    const votes = [makeVote('a', 'b')];

    const result = selectPair(ideas, votes, 1, 'voting_step1');
    // Should still return a pair (fallback to re-pairing)
    expect(result).not.toBeNull();
  });

  // Adjacency enforcement
  it('never pairs market_segment with specific_company', () => {
    const ideas = [
      makeIdea('ms1', 'market_segment'),
      makeIdea('ms2', 'market_segment'),
      makeIdea('sc1', 'specific_company'),
      makeIdea('sc2', 'specific_company'),
      makeIdea('pc1', 'product_category'),
    ];
    for (let i = 0; i < 50; i++) {
      mathRandomSpy.mockReturnValue(i / 50);
      const result = selectPair(ideas, [], 0);
      if (result) {
        const tiers = [result[0].tier, result[1].tier].sort();
        expect(tiers).not.toEqual(['market_segment', 'specific_company']);
      }
    }
  });

  it('never pairs strategic_priority with other tiers', () => {
    const ideas = [
      makeIdea('sp1', 'strategic_priority'),
      makeIdea('sp2', 'strategic_priority'),
      makeIdea('ms1', 'market_segment'),
      makeIdea('pc1', 'product_category'),
    ];
    for (let i = 0; i < 50; i++) {
      mathRandomSpy.mockReturnValue(i / 50);
      const result = selectPair(ideas, [], 0);
      if (result) {
        if (result[0].tier === 'strategic_priority' || result[1].tier === 'strategic_priority') {
          expect(result[0].tier).toBe('strategic_priority');
          expect(result[1].tier).toBe('strategic_priority');
        }
      }
    }
  });

  // Returns null when no valid pairs exist
  it('returns null when only one eligible idea exists for the phase', () => {
    const ideas = [
      makeIdea('sp1', 'strategic_priority'),
      makeIdea('ms1', 'market_segment'),
    ];
    // In step1, only sp1 is eligible — can't form a pair
    // But code falls back to all ideas if < 2 eligible, so it may pair across tiers
    // Actually, with the fallback and adjacency, sp + ms can't pair, so null
    const result = selectPair(ideas, [], 0, 'voting_step1');
    // The fallback gives us [sp1, ms1], but canPair(sp, ms) = false → no valid pairs
    expect(result).toBeNull();
  });
});
