import type { RankedIdea } from '../types/index.ts';

export interface AttributePoint {
  title: string;
  dimensionIndex: number;
  displayScore: number;
}

export interface DimensionSpectrum {
  dimension: string;
  importance: number;
  importanceRank: number;
  position: number; // 0-1, BT-weighted average of dimensionIndex
  attributes: AttributePoint[];
}

export function computeSpectrums(rankings: RankedIdea[]): DimensionSpectrum[] {
  // Group by dimension
  const groups = new Map<string, RankedIdea[]>();
  for (const r of rankings) {
    const dim = r.idea.dimension;
    if (!dim) continue;
    if (!groups.has(dim)) groups.set(dim, []);
    groups.get(dim)!.push(r);
  }

  const spectrums: DimensionSpectrum[] = [];

  for (const [dimension, items] of groups) {
    // Average displayScore = dimension importance
    const importance = items.reduce((sum, r) => sum + r.displayScore, 0) / items.length;

    // Find max dimensionIndex for normalization
    const maxIdx = Math.max(...items.map(r => r.idea.dimensionIndex ?? 0), 1);

    // BT-weighted average of dimensionIndex (normalized 0-1)
    const totalScore = items.reduce((sum, r) => sum + r.displayScore, 0);
    const weightedIdx = totalScore > 0
      ? items.reduce((sum, r) => sum + (r.idea.dimensionIndex ?? 0) * r.displayScore, 0) / totalScore / maxIdx
      : 0.5;

    const attributes: AttributePoint[] = items
      .sort((a, b) => (a.idea.dimensionIndex ?? 0) - (b.idea.dimensionIndex ?? 0))
      .map(r => ({
        title: r.idea.title,
        dimensionIndex: r.idea.dimensionIndex ?? 0,
        displayScore: r.displayScore,
      }));

    spectrums.push({
      dimension,
      importance,
      importanceRank: 0, // filled below
      position: Math.max(0, Math.min(1, weightedIdx)),
      attributes,
    });
  }

  // Sort by importance (highest first) and assign ranks
  spectrums.sort((a, b) => b.importance - a.importance);
  spectrums.forEach((s, i) => { s.importanceRank = i + 1; });

  return spectrums;
}
