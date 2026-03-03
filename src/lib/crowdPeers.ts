import { supabase } from './supabase.ts';
import type { PeerCompany } from '../types/index.ts';

export interface CrowdPeer extends PeerCompany {
  selectionCount: number;
}

/**
 * Fetch crowd-sourced peers for a target company, ordered by selection count.
 * Returns empty array in solo mode (no Supabase).
 */
export async function fetchCrowdPeers(targetSymbol: string): Promise<CrowdPeer[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('crowd_peers')
    .select('*')
    .eq('target_symbol', targetSymbol.toUpperCase())
    .order('selection_count', { ascending: false })
    .limit(30);

  if (error || !data) return [];

  return data.map((row) => ({
    symbol: row.peer_symbol,
    name: row.peer_name,
    marketCap: row.peer_market_cap,
    industry: row.peer_industry,
    logo: row.peer_logo,
    selectionCount: row.selection_count,
  }));
}

/**
 * Record peer selections to the crowd wisdom table.
 * Fire-and-forget — errors are logged but don't block the user flow.
 */
export function recordPeerSelections(
  targetSymbol: string,
  selectedPeers: PeerCompany[]
): void {
  if (!supabase || selectedPeers.length === 0) return;

  const peersJson = selectedPeers.map((p) => ({
    symbol: p.symbol,
    name: p.name,
    marketCap: p.marketCap,
    industry: p.industry,
    logo: p.logo,
  }));

  supabase
    .rpc('record_peer_selections', {
      p_target_symbol: targetSymbol.toUpperCase(),
      p_peers: peersJson,
    })
    .then(({ error }) => {
      if (error) console.error('recordPeerSelections failed:', error);
    });
}

/**
 * Merge FMP peers, crowd peers, and custom search peers into a single deduplicated list.
 * Sorted by selection count descending so popular peers rise to the top.
 * Peers with no crowd votes appear at the end in their original order.
 *
 * Exported for testing.
 */
export function mergePeerLists(
  fmpPeers: PeerCompany[],
  crowdPeers: CrowdPeer[],
  customPeers: PeerCompany[]
): { merged: (PeerCompany & { selectionCount?: number; source: 'fmp' | 'crowd' | 'custom' })[] } {
  const seen = new Set<string>();
  const crowdBySymbol = new Map<string, CrowdPeer>();
  for (const cp of crowdPeers) {
    crowdBySymbol.set(cp.symbol, cp);
  }

  const merged: (PeerCompany & { selectionCount?: number; source: 'fmp' | 'crowd' | 'custom' })[] = [];

  // FMP peers, overlay crowd count if present
  for (const peer of fmpPeers) {
    seen.add(peer.symbol);
    const crowd = crowdBySymbol.get(peer.symbol);
    merged.push({
      ...peer,
      selectionCount: crowd?.selectionCount,
      source: 'fmp',
    });
  }

  // Crowd-only peers (not in FMP)
  for (const cp of crowdPeers) {
    if (!seen.has(cp.symbol)) {
      seen.add(cp.symbol);
      merged.push({ ...cp, selectionCount: cp.selectionCount, source: 'crowd' });
    }
  }

  // Custom search peers — just added, no votes yet
  for (const peer of customPeers) {
    if (!seen.has(peer.symbol)) {
      seen.add(peer.symbol);
      merged.push({ ...peer, selectionCount: undefined, source: 'custom' });
    }
  }

  // Sort: peers with selection counts first (descending), then peers without counts
  merged.sort((a, b) => {
    const aCount = a.selectionCount ?? -1;
    const bCount = b.selectionCount ?? -1;
    return bCount - aCount;
  });

  return { merged };
}
