import { describe, it, expect } from 'vitest';
import { computeRankings } from '../bradleyTerry.ts';
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
    id: `vote-${winnerId}-${loserId}-${Date.now()}-${Math.random()}`,
    voterId: 'test-voter',
    winnerId,
    loserId,
    skipped,
    timestamp: Date.now(),
  };
}

describe('computeRankings', () => {
  it('returns empty array for empty ideas', () => {
    expect(computeRankings([], [])).toEqual([]);
  });

  it('returns single idea at rank 1 with score 1500', () => {
    const ideas = [makeIdea('a')];
    const result = computeRankings(ideas, []);
    expect(result).toHaveLength(1);
    expect(result[0].rank).toBe(1);
    expect(result[0].displayScore).toBe(1500);
  });

  it('returns all ideas at score 1500 when no votes exist', () => {
    const ideas = [makeIdea('a'), makeIdea('b'), makeIdea('c')];
    const result = computeRankings(ideas, []);
    for (const r of result) {
      expect(r.displayScore).toBe(1500);
    }
  });

  it('ranks clear winner higher when A beats B 10 times', () => {
    const ideas = [makeIdea('a'), makeIdea('b')];
    const votes = Array.from({ length: 10 }, () => makeVote('a', 'b'));
    const result = computeRankings(ideas, votes);

    const a = result.find((r) => r.idea.id === 'a')!;
    const b = result.find((r) => r.idea.id === 'b')!;

    expect(a.rank).toBe(1);
    expect(b.rank).toBe(2);
    // With only 2 items, median = the stronger item, so winner scores 1500
    // and loser scores far below (Elo is anchored to median)
    expect(a.displayScore).toBeGreaterThanOrEqual(1500);
    expect(b.displayScore).toBeLessThan(1500);
    expect(a.displayScore).toBeGreaterThan(b.displayScore);
    expect(a.wins).toBe(10);
    expect(a.losses).toBe(0);
    expect(b.wins).toBe(0);
    expect(b.losses).toBe(10);
  });

  it('handles 3-way transitive ranking: A>B, B>C', () => {
    const ideas = [makeIdea('a'), makeIdea('b'), makeIdea('c')];
    const votes = [
      ...Array.from({ length: 5 }, () => makeVote('a', 'b')),
      ...Array.from({ length: 5 }, () => makeVote('b', 'c')),
    ];
    const result = computeRankings(ideas, votes);

    const a = result.find((r) => r.idea.id === 'a')!;
    const b = result.find((r) => r.idea.id === 'b')!;
    const c = result.find((r) => r.idea.id === 'c')!;

    expect(a.rank).toBeLessThan(b.rank);
    expect(b.rank).toBeLessThan(c.rank);
    expect(a.displayScore).toBeGreaterThan(b.displayScore);
    expect(b.displayScore).toBeGreaterThan(c.displayScore);
  });

  it('ignores skipped votes', () => {
    const ideas = [makeIdea('a'), makeIdea('b')];
    const votes = [
      makeVote('a', 'b', true), // skipped
      makeVote('a', 'b', true), // skipped
    ];
    const result = computeRankings(ideas, votes);

    // With only skipped votes, both should be at 1500
    for (const r of result) {
      expect(r.displayScore).toBe(1500);
      expect(r.wins).toBe(0);
      expect(r.losses).toBe(0);
    }
  });

  it('produces confidence intervals where lower < score < upper', () => {
    const ideas = [makeIdea('a'), makeIdea('b')];
    const votes = Array.from({ length: 5 }, () => makeVote('a', 'b'));
    const result = computeRankings(ideas, votes);

    for (const r of result) {
      expect(r.confidenceInterval.lower).toBeLessThan(r.displayScore);
      expect(r.confidenceInterval.upper).toBeGreaterThan(r.displayScore);
    }
  });

  it('narrows confidence intervals with more votes', () => {
    const ideas = [makeIdea('a'), makeIdea('b')];

    const fewVotes = Array.from({ length: 3 }, () => makeVote('a', 'b'));
    const manyVotes = Array.from({ length: 30 }, () => makeVote('a', 'b'));

    const fewResult = computeRankings(ideas, fewVotes);
    const manyResult = computeRankings(ideas, manyVotes);

    const fewA = fewResult.find((r) => r.idea.id === 'a')!;
    const manyA = manyResult.find((r) => r.idea.id === 'a')!;

    const fewWidth = fewA.confidenceInterval.upper - fewA.confidenceInterval.lower;
    const manyWidth = manyA.confidenceInterval.upper - manyA.confidenceInterval.lower;

    expect(manyWidth).toBeLessThan(fewWidth);
  });

  it('assigns ranks 1 through N', () => {
    const ideas = [makeIdea('a'), makeIdea('b'), makeIdea('c'), makeIdea('d')];
    const votes = [
      ...Array.from({ length: 5 }, () => makeVote('a', 'b')),
      ...Array.from({ length: 5 }, () => makeVote('b', 'c')),
      ...Array.from({ length: 5 }, () => makeVote('c', 'd')),
    ];
    const result = computeRankings(ideas, votes);

    const ranks = result.map((r) => r.rank).sort((a, b) => a - b);
    expect(ranks).toEqual([1, 2, 3, 4]);
  });

  it('gives winner score > 1500 with 3+ items (avoids 2-item median edge case)', () => {
    const ideas = [makeIdea('a'), makeIdea('b'), makeIdea('c')];
    const votes = [
      ...Array.from({ length: 8 }, () => makeVote('a', 'b')),
      ...Array.from({ length: 8 }, () => makeVote('a', 'c')),
      ...Array.from({ length: 4 }, () => makeVote('b', 'c')),
    ];
    const result = computeRankings(ideas, votes);

    const a = result.find((r) => r.idea.id === 'a')!;
    // With 3 items, the median anchor is the middle item, so the top item
    // should score above 1500 (unlike the 2-item case where median = winner)
    expect(a.rank).toBe(1);
    expect(a.displayScore).toBeGreaterThan(1500);
  });

  it('gives wide default CI (1200-1800) to items with no votes', () => {
    const ideas = [makeIdea('a'), makeIdea('b'), makeIdea('c')];
    // Only a and b have votes; c has none
    const votes = [makeVote('a', 'b')];
    const result = computeRankings(ideas, votes);

    const c = result.find((r) => r.idea.id === 'c')!;
    expect(c.confidenceInterval.lower).toBe(1200);
    expect(c.confidenceInterval.upper).toBe(1800);
  });
});
