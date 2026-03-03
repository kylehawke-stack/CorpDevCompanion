/**
 * FMP API Cache — Supabase-backed cache-through layer for Financial Modeling Prep API calls.
 *
 * Exports:
 *   cachedFmpFetch(endpoint, params, fmpKey) — drop-in replacement for fmpFetch()
 *   cachedEnrichCompany(companyName, fmpKey) — shared enrichment (search-name → profile)
 *
 * Falls through to direct FMP calls when Supabase env vars are missing (solo mode).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── Supabase client (lazy-init, service role for RLS bypass) ──

let _supabase: SupabaseClient | null | undefined;

function getSupabase(): SupabaseClient | null {
  if (_supabase !== undefined) return _supabase;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    _supabase = null;
    return null;
  }
  _supabase = createClient(url, key);
  return _supabase;
}

// ── TTL by data category (seconds) ──

const TTL: Record<string, number> = {
  quote: 3600,               // 1h
  profile: 86400,            // 24h
  financial_statement: 86400,// 24h
  metrics: 86400,            // 24h
  reference: 604800,         // 7d
  news: 21600,               // 6h
  search: 86400,             // 24h
};

// ── Endpoint → category mapping ──

function categorize(endpoint: string): string {
  if (endpoint === "quote") return "quote";
  if (endpoint === "profile") return "profile";
  if (
    endpoint === "income-statement" ||
    endpoint === "balance-sheet-statement" ||
    endpoint === "cash-flow-statement"
  )
    return "financial_statement";
  if (
    endpoint === "key-metrics" ||
    endpoint === "ratios" ||
    endpoint === "enterprise-values" ||
    endpoint === "analyst-estimates" ||
    endpoint === "price-target-consensus" ||
    endpoint === "revenue-product-segmentation" ||
    endpoint === "revenue-geographic-segments"
  )
    return "metrics";
  if (
    endpoint === "industry-classification-search" ||
    endpoint === "stock-peers" ||
    endpoint === "earning-call-transcript"
  )
    return "reference";
  if (
    endpoint.startsWith("news/") ||
    endpoint === "press-releases" ||
    endpoint.startsWith("sec-filings") ||
    endpoint.startsWith("mergers-acquisitions")
  )
    return "news";
  if (endpoint === "search" || endpoint === "search-name") return "search";
  return "profile"; // conservative default
}

// ── Build deterministic cache key from params (sorted, minus apikey) ──

function buildParamsKey(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([k]) => k !== "apikey")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

// ── Core: cache-through FMP fetch ──

export async function cachedFmpFetch(
  endpoint: string,
  params: Record<string, string>,
  fmpKey: string
): Promise<any | null> {
  const paramsKey = buildParamsKey(params);
  const category = categorize(endpoint);
  const ttl = TTL[category] ?? 86400;
  const sb = getSupabase();

  // 1. Check cache
  if (sb) {
    try {
      const { data } = await sb.rpc("get_fmp_cache", {
        p_endpoint: endpoint,
        p_params_key: paramsKey,
        p_ttl_seconds: ttl,
      });
      if (data !== null && data !== undefined) {
        return data;
      }
    } catch {
      // Cache miss or error — fall through to FMP
    }
  }

  // 2. Fetch from FMP
  let result: any | null;
  try {
    const qs = new URLSearchParams({ ...params, apikey: fmpKey });
    const res = await fetch(
      `https://financialmodelingprep.com/stable/${endpoint}?${qs}`
    );
    if (!res.ok) return null;
    result = await res.json();
  } catch {
    return null;
  }

  // 3. Store in cache (fire-and-forget)
  if (sb && result !== null && result !== undefined) {
    sb.rpc("upsert_fmp_cache", {
      p_endpoint: endpoint,
      p_params_key: paramsKey,
      p_data_category: category,
      p_response_data: result,
    }).catch(() => {});
  }

  return result;
}

// ── Shared enrichment: search-name → profile lookup ──

interface FmpSearchResult {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
}

interface FmpProfile {
  symbol: string;
  companyName: string;
  marketCap: number;
  fullTimeEmployees: string;
  sector: string;
  industry: string;
  website: string;
  image: string;
}

export interface CompanyEnrichment {
  tags: string[];
  website?: string;
  logoUrl?: string;
}

function formatMarketCap(mc: number): string {
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(1)}B`;
  return `$${(mc / 1e6).toFixed(0)}M`;
}

export async function cachedEnrichCompany(
  companyName: string,
  fmpKey: string
): Promise<CompanyEnrichment | null> {
  try {
    const cleanName = companyName
      .replace(
        /\s*(Inc\.?|Corp\.?|Corporation|LLC|Ltd\.?|Holdings?|Co\.?|Group|Brands?|Company)\s*$/i,
        ""
      )
      .trim();

    const results: FmpSearchResult[] | null = await cachedFmpFetch(
      "search-name",
      { query: cleanName },
      fmpKey
    );
    if (!results || !Array.isArray(results) || results.length === 0)
      return null;

    // Prefer US exchanges
    const usResult =
      results.find(
        (r) =>
          r.exchange === "NYSE" ||
          r.exchange === "NASDAQ" ||
          r.exchange === "AMEX"
      ) ?? results[0];

    // Validate: the matched name should share significant words with the search query
    const queryWords = new Set(cleanName.toLowerCase().split(/\s+/));
    const matchWords = usResult.name.toLowerCase().split(/\s+/);
    const overlap = matchWords.filter((w) => queryWords.has(w)).length;
    if (overlap === 0 && cleanName.length > 4) return null;

    const profiles = await cachedFmpFetch(
      "profile",
      { symbol: usResult.symbol },
      fmpKey
    );
    if (!Array.isArray(profiles) || profiles.length === 0) return null;

    const p = profiles[0] as FmpProfile;
    if (p.marketCap && p.marketCap < 5_000_000) return null;

    const tags: string[] = [];
    if (p.marketCap) tags.push(`Mkt Cap: ${formatMarketCap(p.marketCap)}`);
    if (p.fullTimeEmployees && Number(p.fullTimeEmployees) > 100) {
      tags.push(`${Number(p.fullTimeEmployees).toLocaleString()} employees`);
    }
    if (p.sector) tags.push(p.industry || p.sector);

    return {
      tags,
      website: p.website || undefined,
      logoUrl: p.image || undefined,
    };
  } catch {
    return null;
  }
}
