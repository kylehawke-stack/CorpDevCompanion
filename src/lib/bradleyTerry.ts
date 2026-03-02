import type { Idea, Vote, RankedIdea, ConfidenceInterval } from '../types/index.ts';

/**
 * Bradley-Terry MLE ranking using the Hunter 2004 MM algorithm.
 * Converges in <1ms for ~80 items.
 */

interface WinLossRecord {
  wins: number;
  losses: number;
  opponents: Map<string, { winsAgainst: number; totalGames: number }>;
}

function buildWinLossMap(votes: Vote[]): Map<string, WinLossRecord> {
  const records = new Map<string, WinLossRecord>();

  const getOrCreate = (id: string): WinLossRecord => {
    if (!records.has(id)) {
      records.set(id, { wins: 0, losses: 0, opponents: new Map() });
    }
    return records.get(id)!;
  };

  for (const vote of votes) {
    if (vote.skipped) continue;

    const winner = getOrCreate(vote.winnerId);
    const loser = getOrCreate(vote.loserId);

    winner.wins++;
    loser.losses++;

    // Update opponent records for winner
    const winnerVsLoser = winner.opponents.get(vote.loserId) ?? { winsAgainst: 0, totalGames: 0 };
    winnerVsLoser.winsAgainst++;
    winnerVsLoser.totalGames++;
    winner.opponents.set(vote.loserId, winnerVsLoser);

    // Update opponent records for loser
    const loserVsWinner = loser.opponents.get(vote.winnerId) ?? { winsAgainst: 0, totalGames: 0 };
    loserVsWinner.totalGames++;
    loser.opponents.set(vote.winnerId, loserVsWinner);
  }

  return records;
}

/**
 * Hunter 2004 MM iterative algorithm for Bradley-Terry MLE.
 * Returns strength parameters (higher = better).
 */
function computeStrengths(
  ideaIds: string[],
  records: Map<string, WinLossRecord>,
  maxIterations = 100,
  tolerance = 1e-6
): Map<string, number> {
  const n = ideaIds.length;
  if (n === 0) return new Map();

  // Initialize all strengths to 1
  const strengths = new Map<string, number>();
  for (const id of ideaIds) {
    strengths.set(id, 1.0);
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    let maxChange = 0;

    for (const id of ideaIds) {
      const record = records.get(id);
      if (!record || record.wins + record.losses === 0) continue;

      const wi = record.wins;
      if (wi === 0) {
        strengths.set(id, tolerance); // Avoid zero
        continue;
      }

      let denomSum = 0;
      for (const [oppId, oppRecord] of record.opponents) {
        const pj = strengths.get(oppId) ?? 1.0;
        const pi = strengths.get(id) ?? 1.0;
        denomSum += oppRecord.totalGames / (pi + pj);
      }

      if (denomSum === 0) continue;

      const newStrength = wi / denomSum;
      const oldStrength = strengths.get(id) ?? 1.0;
      maxChange = Math.max(maxChange, Math.abs(newStrength - oldStrength) / oldStrength);
      strengths.set(id, newStrength);
    }

    // Normalize so geometric mean = 1
    let logSum = 0;
    let count = 0;
    for (const s of strengths.values()) {
      if (s > 0) {
        logSum += Math.log(s);
        count++;
      }
    }
    if (count > 0) {
      const geoMean = Math.exp(logSum / count);
      for (const [id, s] of strengths) {
        strengths.set(id, s / geoMean);
      }
    }

    if (maxChange < tolerance) break;
  }

  return strengths;
}

/**
 * Convert BT strength to Elo-equivalent score (median at 1500).
 */
function strengthToElo(strength: number, medianStrength: number): number {
  if (medianStrength <= 0 || strength <= 0) return 1500;
  return 1500 + 400 * Math.log10(strength / medianStrength);
}

/**
 * Approximate confidence interval using Fisher information.
 * Returns CI in Elo-equivalent units.
 */
function computeConfidenceInterval(
  id: string,
  strength: number,
  records: Map<string, WinLossRecord>,
  strengths: Map<string, number>,
  medianStrength: number
): ConfidenceInterval {
  const record = records.get(id);
  if (!record || record.opponents.size === 0) {
    return { lower: 1200, upper: 1800 }; // Wide default
  }

  // Fisher information: sum over opponents of n_ij * pi * pj / (pi + pj)^2
  let fisherInfo = 0;
  const pi = strength;

  for (const [oppId, oppRecord] of record.opponents) {
    const pj = strengths.get(oppId) ?? 1.0;
    const nij = oppRecord.totalGames;
    fisherInfo += (nij * pi * pj) / ((pi + pj) * (pi + pj));
  }

  if (fisherInfo <= 0) {
    return { lower: 1200, upper: 1800 };
  }

  // Standard error on strength scale
  const se = 1 / Math.sqrt(fisherInfo);

  // Convert to Elo scale (using derivative of log transform)
  const eloSe = (400 / Math.log(10)) * (se / pi);
  const elo = strengthToElo(strength, medianStrength);

  return {
    lower: Math.round(elo - 1.96 * eloSe),
    upper: Math.round(elo + 1.96 * eloSe),
  };
}

/**
 * Main ranking function: takes ideas + votes, returns ranked ideas.
 */
export function computeRankings(ideas: Idea[], votes: Vote[]): RankedIdea[] {
  const ideaIds = ideas.map((i) => i.id);
  const records = buildWinLossMap(votes);
  const strengths = computeStrengths(ideaIds, records);

  // Find median strength for Elo conversion
  const strengthValues = [...strengths.values()].filter((s) => s > 0).sort((a, b) => a - b);
  const medianStrength =
    strengthValues.length > 0
      ? strengthValues[Math.floor(strengthValues.length / 2)]
      : 1.0;

  const ranked: RankedIdea[] = ideas.map((idea) => {
    const strength = strengths.get(idea.id) ?? 1.0;
    const record = records.get(idea.id);
    const wins = record?.wins ?? 0;
    const losses = record?.losses ?? 0;
    const displayScore = Math.round(strengthToElo(strength, medianStrength));
    const confidenceInterval = computeConfidenceInterval(
      idea.id,
      strength,
      records,
      strengths,
      medianStrength
    );

    return {
      idea,
      strength,
      displayScore,
      wins,
      losses,
      rank: 0, // Will be set after sorting
      confidenceInterval,
    };
  });

  // Sort by strength descending
  ranked.sort((a, b) => b.strength - a.strength);

  // Assign ranks
  ranked.forEach((r, i) => {
    r.rank = i + 1;
  });

  return ranked;
}
