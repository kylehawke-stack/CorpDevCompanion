import { describe, it, expect } from 'vitest';

/**
 * Tests that our search-company function correctly handles FMP's /stable/search-name
 * field names. The bug: FMP returns `exchange` (not `exchangeShortName`) in the
 * stable API, and our filter/map logic must handle both field names.
 */

// Fixture based on real FMP /stable/search-name response shape
const FMP_SEARCH_NAME_FIXTURE = [
  {
    symbol: 'HBB',
    name: 'Hamilton Beach Brands Holding Company',
    exchange: 'NYSE',
    currency: 'USD',
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    currency: 'USD',
  },
  {
    symbol: 'BTCUSD',
    name: 'Bitcoin',
    exchange: 'CRYPTO',
    currency: 'USD',
  },
  {
    // Edge case: legacy shape with exchangeShortName instead of exchange
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    exchangeShortName: 'NASDAQ',
    currency: 'USD',
  },
  {
    symbol: 'PNKF',
    name: 'Some OTC Company',
    exchange: 'OTC',
    currency: 'USD',
  },
];

/**
 * Extracted filter+map logic from search-company.mts for unit testing.
 * This mirrors the exact logic in the function handler.
 */
function filterAndMapResults(data: any[]) {
  return (Array.isArray(data) ? data : [])
    .filter((d: any) => {
      const ex = d.exchange || d.exchangeShortName;
      return ex && !['OTC', 'CRYPTO'].includes(ex);
    })
    .slice(0, 8)
    .map((d: any) => ({
      symbol: d.symbol,
      name: d.name,
      exchange: d.exchange || d.exchangeShortName,
    }));
}

describe('FMP search-name field shapes', () => {
  it('reads exchange field from stable API response', () => {
    const results = filterAndMapResults(FMP_SEARCH_NAME_FIXTURE);
    const hbb = results.find((r: any) => r.symbol === 'HBB');
    expect(hbb).toBeDefined();
    expect(hbb!.exchange).toBe('NYSE');
  });

  it('filters out CRYPTO and OTC exchanges', () => {
    const results = filterAndMapResults(FMP_SEARCH_NAME_FIXTURE);
    const symbols = results.map((r: any) => r.symbol);
    expect(symbols).not.toContain('BTCUSD');
    expect(symbols).not.toContain('PNKF');
  });

  it('falls back to exchangeShortName when exchange is missing', () => {
    const results = filterAndMapResults(FMP_SEARCH_NAME_FIXTURE);
    const tsla = results.find((r: any) => r.symbol === 'TSLA');
    expect(tsla).toBeDefined();
    expect(tsla!.exchange).toBe('NASDAQ');
  });

  it('returns correct number of filtered results', () => {
    const results = filterAndMapResults(FMP_SEARCH_NAME_FIXTURE);
    // HBB (NYSE), AAPL (NASDAQ), TSLA (NASDAQ fallback) = 3 results
    // BTCUSD (CRYPTO) and PNKF (OTC) filtered out
    expect(results).toHaveLength(3);
  });

  it('limits results to 8', () => {
    const manyResults = Array.from({ length: 20 }, (_, i) => ({
      symbol: `SYM${i}`,
      name: `Company ${i}`,
      exchange: 'NYSE',
    }));
    const results = filterAndMapResults(manyResults);
    expect(results).toHaveLength(8);
  });

  it('handles empty array', () => {
    expect(filterAndMapResults([])).toEqual([]);
  });

  it('handles non-array input', () => {
    expect(filterAndMapResults(null as any)).toEqual([]);
    expect(filterAndMapResults(undefined as any)).toEqual([]);
  });
});
