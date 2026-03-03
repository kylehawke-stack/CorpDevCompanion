import { describe, it, expect } from 'vitest';
import { mergePeerLists, type CrowdPeer } from '../crowdPeers.ts';
import type { PeerCompany } from '../../types/index.ts';

function makePeer(symbol: string, name = `${symbol} Inc.`): PeerCompany {
  return { symbol, name, marketCap: 1e9, industry: 'Consumer Goods', logo: '' };
}

function makeCrowdPeer(symbol: string, selectionCount: number, name = `${symbol} Inc.`): CrowdPeer {
  return { symbol, name, marketCap: 1e9, industry: 'Consumer Goods', logo: '', selectionCount };
}

describe('mergePeerLists', () => {
  it('returns FMP peers in original order when no crowd/custom', () => {
    const fmp = [makePeer('AAPL'), makePeer('GOOG'), makePeer('MSFT')];
    const { merged } = mergePeerLists(fmp, [], []);

    expect(merged).toHaveLength(3);
    expect(merged[0].symbol).toBe('AAPL');
    expect(merged[1].symbol).toBe('GOOG');
    expect(merged[2].symbol).toBe('MSFT');
    expect(merged.every(p => p.source === 'fmp')).toBe(true);
  });

  it('sorts by selection count descending — crowd peers with votes rise above FMP peers without', () => {
    const fmp = [makePeer('AAPL')];
    const crowd = [makeCrowdPeer('NFLX', 12), makeCrowdPeer('TSLA', 5)];
    const { merged } = mergePeerLists(fmp, crowd, []);

    expect(merged).toHaveLength(3);
    // Crowd peers with votes sort above FMP peers without
    expect(merged[0]).toMatchObject({ symbol: 'NFLX', source: 'crowd', selectionCount: 12 });
    expect(merged[1]).toMatchObject({ symbol: 'TSLA', source: 'crowd', selectionCount: 5 });
    expect(merged[2]).toMatchObject({ symbol: 'AAPL', source: 'fmp' });
  });

  it('peers without counts appear after those with counts', () => {
    const fmp = [makePeer('AAPL')];
    const crowd = [makeCrowdPeer('TSLA', 3)];
    const custom = [makePeer('RIVN')];
    const { merged } = mergePeerLists(fmp, crowd, custom);

    expect(merged).toHaveLength(3);
    expect(merged[0]).toMatchObject({ symbol: 'TSLA', source: 'crowd', selectionCount: 3 });
    // No-count peers follow
    expect(merged[1]).toMatchObject({ symbol: 'AAPL', source: 'fmp' });
    expect(merged[2]).toMatchObject({ symbol: 'RIVN', source: 'custom' });
  });

  it('deduplicates by symbol — FMP wins over crowd, count overlaid, sorted by count', () => {
    const fmp = [makePeer('AAPL'), makePeer('TSLA')];
    const crowd = [makeCrowdPeer('TSLA', 10), makeCrowdPeer('NFLX', 5)];
    const { merged } = mergePeerLists(fmp, crowd, []);

    expect(merged).toHaveLength(3);
    // TSLA appears only once (from FMP), but with crowd count overlaid
    const tsla = merged.find(p => p.symbol === 'TSLA')!;
    expect(tsla.source).toBe('fmp');
    expect(tsla.selectionCount).toBe(10);
    // Sorted by count: TSLA (10), NFLX (5), AAPL (no count)
    expect(merged.map(p => p.symbol)).toEqual(['TSLA', 'NFLX', 'AAPL']);
  });

  it('deduplicates custom peers that match FMP or crowd', () => {
    const fmp = [makePeer('AAPL')];
    const crowd = [makeCrowdPeer('TSLA', 3)];
    const custom = [makePeer('AAPL'), makePeer('TSLA'), makePeer('RIVN')];
    const { merged } = mergePeerLists(fmp, crowd, custom);

    // AAPL from FMP, TSLA from crowd, RIVN from custom — no duplicates
    expect(merged).toHaveLength(3);
    // Sorted by count: TSLA (3), then no-count peers
    expect(merged[0].symbol).toBe('TSLA');
    expect(merged.map(p => p.symbol)).toContain('AAPL');
    expect(merged.map(p => p.symbol)).toContain('RIVN');
  });

  it('overlays crowd count onto FMP peers', () => {
    const fmp = [makePeer('AAPL'), makePeer('GOOG')];
    const crowd = [makeCrowdPeer('AAPL', 7)];
    const { merged } = mergePeerLists(fmp, crowd, []);

    const aapl = merged.find(p => p.symbol === 'AAPL')!;
    const goog = merged.find(p => p.symbol === 'GOOG')!;
    expect(aapl.selectionCount).toBe(7);
    expect(goog.selectionCount).toBeUndefined();
  });

  it('handles empty crowd peers (solo mode path)', () => {
    const fmp = [makePeer('AAPL'), makePeer('GOOG')];
    const { merged } = mergePeerLists(fmp, [], []);

    expect(merged).toHaveLength(2);
    expect(merged.every(p => p.source === 'fmp')).toBe(true);
    expect(merged.every(p => p.selectionCount === undefined)).toBe(true);
  });

  it('handles all empty inputs', () => {
    const { merged } = mergePeerLists([], [], []);
    expect(merged).toEqual([]);
  });
});
