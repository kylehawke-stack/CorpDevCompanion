import { describe, it, expect } from 'vitest';
import { computeSpectrums } from '../spectrumComputation.ts';
import type { RankedIdea, Idea } from '../../types/index.ts';

function makeRankedIdea(
  id: string,
  displayScore: number,
  dimension?: string,
  dimensionIndex?: number,
): RankedIdea {
  const idea: Idea = {
    id,
    title: `Idea ${id}`,
    tier: 'strategic_priority',
    blurb: [],
    source: 'seed',
    createdAt: Date.now(),
    dimension,
    dimensionIndex,
  };
  return {
    idea,
    strength: 1.0,
    displayScore,
    wins: 0,
    losses: 0,
    rank: 1,
    confidenceInterval: { lower: 1200, upper: 1800 },
  };
}

describe('computeSpectrums', () => {
  it('returns empty array for empty input', () => {
    expect(computeSpectrums([])).toEqual([]);
  });

  it('excludes items with no dimension', () => {
    const rankings = [
      makeRankedIdea('a', 1500), // no dimension
      makeRankedIdea('b', 1600), // no dimension
    ];
    expect(computeSpectrums(rankings)).toEqual([]);
  });

  it('computes single dimension correctly', () => {
    const rankings = [
      makeRankedIdea('a', 1400, 'Growth', 0),
      makeRankedIdea('b', 1600, 'Growth', 1),
    ];
    const result = computeSpectrums(rankings);

    expect(result).toHaveLength(1);
    expect(result[0].dimension).toBe('Growth');
    expect(result[0].importance).toBe(1500); // average of 1400 and 1600
    expect(result[0].importanceRank).toBe(1);
    expect(result[0].position).toBeGreaterThanOrEqual(0);
    expect(result[0].position).toBeLessThanOrEqual(1);
  });

  it('ranks dimensions by importance (higher avg score = rank 1)', () => {
    const rankings = [
      makeRankedIdea('a', 1400, 'Growth', 0),
      makeRankedIdea('b', 1300, 'Growth', 1),
      makeRankedIdea('c', 1700, 'Risk', 0),
      makeRankedIdea('d', 1600, 'Risk', 1),
    ];
    const result = computeSpectrums(rankings);

    expect(result).toHaveLength(2);
    // Risk has higher avg (1650) than Growth (1350)
    expect(result[0].dimension).toBe('Risk');
    expect(result[0].importanceRank).toBe(1);
    expect(result[1].dimension).toBe('Growth');
    expect(result[1].importanceRank).toBe(2);
  });

  it('position is near 0 when all items have dimensionIndex 0', () => {
    const rankings = [
      makeRankedIdea('a', 1500, 'Growth', 0),
      makeRankedIdea('b', 1600, 'Growth', 0),
    ];
    const result = computeSpectrums(rankings);
    // maxIdx = Math.max(0, 0, 1) = 1; weighted average of 0s = 0
    expect(result[0].position).toBe(0);
  });

  it('position is 1 when all items have the max dimensionIndex', () => {
    const rankings = [
      makeRankedIdea('a', 1500, 'Growth', 3),
      makeRankedIdea('b', 1600, 'Growth', 3),
    ];
    const result = computeSpectrums(rankings);
    // maxIdx = 3; weighted average = 3/3 = 1.0
    expect(result[0].position).toBe(1);
  });

  it('position is clamped to [0, 1]', () => {
    const rankings = [
      makeRankedIdea('a', 1500, 'Growth', 0),
      makeRankedIdea('b', 1500, 'Growth', 2),
    ];
    const result = computeSpectrums(rankings);
    expect(result[0].position).toBeGreaterThanOrEqual(0);
    expect(result[0].position).toBeLessThanOrEqual(1);
  });

  it('position defaults to 0.5 when totalScore is 0', () => {
    const rankings = [
      makeRankedIdea('a', 0, 'Growth', 0),
      makeRankedIdea('b', 0, 'Growth', 2),
    ];
    const result = computeSpectrums(rankings);
    expect(result[0].position).toBe(0.5);
  });

  it('sorts attributes by dimensionIndex ascending', () => {
    const rankings = [
      makeRankedIdea('c', 1500, 'Growth', 2),
      makeRankedIdea('a', 1500, 'Growth', 0),
      makeRankedIdea('b', 1500, 'Growth', 1),
    ];
    const result = computeSpectrums(rankings);
    const indices = result[0].attributes.map((a) => a.dimensionIndex);
    expect(indices).toEqual([0, 1, 2]);
  });

  it('attributes contain correct title and displayScore', () => {
    const rankings = [
      makeRankedIdea('x', 1700, 'Growth', 0),
    ];
    const result = computeSpectrums(rankings);
    expect(result[0].attributes).toHaveLength(1);
    expect(result[0].attributes[0].title).toBe('Idea x');
    expect(result[0].attributes[0].displayScore).toBe(1700);
    expect(result[0].attributes[0].dimensionIndex).toBe(0);
  });

  it('handles mixed items with and without dimensions', () => {
    const rankings = [
      makeRankedIdea('a', 1500, 'Growth', 0),
      makeRankedIdea('b', 1600), // no dimension, should be excluded
      makeRankedIdea('c', 1400, 'Growth', 1),
    ];
    const result = computeSpectrums(rankings);
    expect(result).toHaveLength(1);
    expect(result[0].attributes).toHaveLength(2);
  });
});
