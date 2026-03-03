import type { Idea, Vote, Tier, RankedIdea, GameState } from '../types/index.ts';
import { canPair } from './adjacencyRules.ts';
import { computeRankings } from './bradleyTerry.ts';

/**
 * Funnel weighting: controls tier distribution based on phase and vote count.
 */
function getTierWeights(
  totalVotes: number,
  phase?: GameState['phase']
): Record<Tier, number> {
  if (phase === 'voting_step1') {
    return { strategic_priority: 1.0, market_segment: 0, product_category: 0, specific_company: 0 };
  }
  if (phase === 'voting_step2') {
    return { strategic_priority: 0, market_segment: 0.55, product_category: 0.45, specific_company: 0 };
  }
  if (phase === 'voting_step3') {
    return { strategic_priority: 0, market_segment: 0, product_category: 0, specific_company: 1.0 };
  }
  // Legacy fallback
  if (totalVotes <= 30) {
    return { strategic_priority: 0, market_segment: 0.6, product_category: 0.3, specific_company: 0.1 };
  }
  if (totalVotes <= 80) {
    return { strategic_priority: 0, market_segment: 0.2, product_category: 0.5, specific_company: 0.3 };
  }
  return { strategic_priority: 0, market_segment: 0.0, product_category: 0.3, specific_company: 0.7 };
}

/**
 * Count comparisons for each idea.
 */
function getComparisonCounts(ideas: Idea[], votes: Vote[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const idea of ideas) {
    counts.set(idea.id, 0);
  }
  for (const vote of votes) {
    if (vote.skipped) continue;
    counts.set(vote.winnerId, (counts.get(vote.winnerId) ?? 0) + 1);
    counts.set(vote.loserId, (counts.get(vote.loserId) ?? 0) + 1);
  }
  return counts;
}

/**
 * Select a tier based on funnel weights.
 */
function selectTier(weights: Record<Tier, number>): Tier {
  const r = Math.random();
  let cumulative = 0;
  for (const [tier, weight] of Object.entries(weights) as [Tier, number][]) {
    cumulative += weight;
    if (r <= cumulative) return tier;
  }
  return 'product_category'; // fallback
}

/**
 * Get all valid pairs from a set of ideas (respecting adjacency).
 */
function getValidPairs(ideas: Idea[]): [Idea, Idea][] {
  const pairs: [Idea, Idea][] = [];
  for (let i = 0; i < ideas.length; i++) {
    for (let j = i + 1; j < ideas.length; j++) {
      if (canPair(ideas[i].tier, ideas[j].tier)) {
        pairs.push([ideas[i], ideas[j]]);
      }
    }
  }
  return pairs;
}

/**
 * Check if this specific pair has already been shown.
 */
function pairAlreadyVoted(a: string, b: string, votes: Vote[]): boolean {
  return votes.some(
    (v) =>
      (v.winnerId === a && v.loserId === b) ||
      (v.winnerId === b && v.loserId === a) ||
      (v.skipped && ((v.winnerId === a && v.loserId === b) || (v.winnerId === b && v.loserId === a)))
  );
}

/**
 * Main pairing selection with 3-rule priority system.
 *
 * 1. New item boost: items with <3 comparisons get 50% selection probability
 * 2. Uncertainty reduction: weighted sampling by CI overlap with diversity penalty
 * 3. Adjacency enforcement: all pairs must satisfy tier adjacency matrix
 *
 * @param recentItemIds - sliding window of recently shown item IDs (last 3 pairs = 6 IDs)
 *   Used to penalize pairs involving items that were just shown, preventing
 *   the same item from dominating one side of the pairing.
 */
export function selectPair(
  ideas: Idea[],
  votes: Vote[],
  totalVoteCount: number,
  phase?: GameState['phase'],
  recentItemIds?: string[]
): [Idea, Idea] | null {
  if (ideas.length < 2) return null;

  const weights = getTierWeights(totalVoteCount, phase);
  const counts = getComparisonCounts(ideas, votes);
  const recent = new Set(recentItemIds ?? []);
  // The last pair shown (first 2 items in recentItemIds) — excluded to guard
  // against stale closures where the latest vote isn't yet in the votes array
  const lastPair = recentItemIds && recentItemIds.length >= 2
    ? [recentItemIds[recentItemIds.length - 2], recentItemIds[recentItemIds.length - 1]]
    : null;

  // Filter ideas by eligible tiers for the current phase
  const eligibleIdeas = ideas.filter((idea) => weights[idea.tier] > 0);
  const poolIdeas = eligibleIdeas.length >= 2 ? eligibleIdeas : ideas;

  // Get all valid pairs that haven't been voted on yet
  let allPairs = getValidPairs(poolIdeas);

  // Step 3: every pair must include at least one specific_company
  if (phase === 'voting_step3') {
    const companyPairs = allPairs.filter(
      ([a, b]) => a.tier === 'specific_company' || b.tier === 'specific_company'
    );
    if (companyPairs.length > 0) allPairs = companyPairs;
  }

  const isLastPair = (a: string, b: string) =>
    lastPair !== null &&
    ((a === lastPair[0] && b === lastPair[1]) || (a === lastPair[1] && b === lastPair[0]));

  const availablePairs = allPairs.filter(
    ([a, b]) => !pairAlreadyVoted(a.id, b.id, votes) && !isLastPair(a.id, b.id)
  );

  // If all pairs exhausted, allow re-pairing but exclude the last-shown pair
  let fallbackPairs = allPairs;
  if (lastPair && allPairs.length > 1) {
    const filtered = allPairs.filter(([a, b]) => !isLastPair(a.id, b.id));
    if (filtered.length > 0) fallbackPairs = filtered;
  }
  const candidatePairs = availablePairs.length > 0 ? availablePairs : fallbackPairs;
  if (candidatePairs.length === 0) return null;

  // Rule 1: New item boost — items with <3 comparisons get 50% selection
  const newItemPairs = candidatePairs.filter(
    ([a, b]) => (counts.get(a.id) ?? 0) < 3 || (counts.get(b.id) ?? 0) < 3
  );

  if (newItemPairs.length > 0 && Math.random() < 0.5) {
    // Prefer pairs where neither item was recently shown
    const freshPairs = newItemPairs.filter(
      ([a, b]) => !recent.has(a.id) && !recent.has(b.id)
    );
    const pool = freshPairs.length > 0 ? freshPairs : newItemPairs;
    const tierFiltered = filterByTierWeights(pool, weights);
    const finalPool = tierFiltered.length > 0 ? tierFiltered : pool;
    return finalPool[Math.floor(Math.random() * finalPool.length)];
  }

  // Rule 2: Weighted sampling by CI overlap + diversity penalty
  const rankings = computeRankings(poolIdeas, votes);
  const rankMap = new Map<string, RankedIdea>();
  for (const r of rankings) {
    rankMap.set(r.idea.id, r);
  }

  // Base weight ensures every pair has some minimum selection probability
  const BASE_WEIGHT = 50;

  const scoredPairs = candidatePairs.map(([a, b]) => {
    const ra = rankMap.get(a.id);
    const rb = rankMap.get(b.id);
    let overlap = 0;
    if (ra && rb) {
      const overlapStart = Math.max(ra.confidenceInterval.lower, rb.confidenceInterval.lower);
      const overlapEnd = Math.min(ra.confidenceInterval.upper, rb.confidenceInterval.upper);
      overlap = Math.max(0, overlapEnd - overlapStart);
    }

    // Diversity penalty: reduce weight for pairs involving recently-shown items
    let diversityMultiplier = 1.0;
    const aRecent = recent.has(a.id);
    const bRecent = recent.has(b.id);
    if (aRecent && bRecent) diversityMultiplier = 0.1;
    else if (aRecent || bRecent) diversityMultiplier = 0.3;

    const weight = (overlap + BASE_WEIGHT) * diversityMultiplier;
    return { pair: [a, b] as [Idea, Idea], weight };
  });

  // Filter by tier weights
  const targetTier = selectTier(weights);
  const tierFiltered = scoredPairs.filter(
    ({ pair: [a, b] }) => a.tier === targetTier || b.tier === targetTier
  );
  const finalPool = tierFiltered.length > 0 ? tierFiltered : scoredPairs;

  // Weighted random selection
  const totalWeight = finalPool.reduce((sum, sp) => sum + sp.weight, 0);
  if (totalWeight <= 0) {
    return candidatePairs[Math.floor(Math.random() * candidatePairs.length)];
  }

  let r = Math.random() * totalWeight;
  for (const sp of finalPool) {
    r -= sp.weight;
    if (r <= 0) return sp.pair;
  }
  return finalPool[finalPool.length - 1].pair;
}

/**
 * Filter pairs to prefer those matching current tier weight distribution.
 */
function filterByTierWeights(
  pairs: [Idea, Idea][],
  weights: Record<Tier, number>
): [Idea, Idea][] {
  const targetTier = selectTier(weights);

  // Prefer pairs where at least one idea matches the target tier
  const matching = pairs.filter(
    ([a, b]) => a.tier === targetTier || b.tier === targetTier
  );

  return matching;
}
