import { supabase } from './supabase.ts';
import type { FinancialHighlight, Idea } from '../types/index.ts';

/**
 * Briefing cache — stores AI-generated insight cards and strategic ideas
 * in Supabase so they don't need to be regenerated every session.
 *
 * Cache key: (symbol, card_type, peer_key)
 * - symbol: company ticker
 * - card_type: 'insights' | 'competitive' | 'strategic_ideas'
 * - peer_key: sorted peer symbols joined (for competitive), or '' for others
 *
 * Entries expire after 30 days (quarterly financials don't change often).
 */

const CACHE_TTL_DAYS = 30;

function isExpired(createdAt: string): boolean {
  const age = Date.now() - new Date(createdAt).getTime();
  return age > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
}

function makePeerKey(peerSymbols?: string[]): string {
  if (!peerSymbols || peerSymbols.length === 0) return '';
  return [...peerSymbols].sort().join(',');
}

/** Check cache for insights (Earnings Call + Analyst cards) */
export async function getCachedInsights(symbol: string): Promise<FinancialHighlight[] | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('briefing_cache')
    .select('data, created_at')
    .eq('symbol', symbol.toUpperCase())
    .eq('card_type', 'insights')
    .eq('peer_key', '')
    .single();

  if (!data || isExpired(data.created_at)) return null;
  return data.data as FinancialHighlight[];
}

/** Check cache for competitive positioning cards */
export async function getCachedCompetitive(symbol: string, peerSymbols: string[]): Promise<FinancialHighlight[] | null> {
  if (!supabase) return null;
  const peerKey = makePeerKey(peerSymbols);
  const { data } = await supabase
    .from('briefing_cache')
    .select('data, created_at')
    .eq('symbol', symbol.toUpperCase())
    .eq('card_type', 'competitive')
    .eq('peer_key', peerKey)
    .single();

  if (!data || isExpired(data.created_at)) return null;
  return data.data as FinancialHighlight[];
}

/** Check cache for strategic ideas */
export async function getCachedStrategicIdeas(symbol: string): Promise<Idea[] | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('briefing_cache')
    .select('data, created_at')
    .eq('symbol', symbol.toUpperCase())
    .eq('card_type', 'strategic_ideas')
    .eq('peer_key', '')
    .single();

  if (!data || isExpired(data.created_at)) return null;
  return data.data as Idea[];
}

/** Store insights in cache */
export async function cacheInsights(symbol: string, highlights: FinancialHighlight[]): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('briefing_cache')
    .upsert({
      symbol: symbol.toUpperCase(),
      card_type: 'insights',
      peer_key: '',
      data: highlights,
    }, { onConflict: 'symbol,card_type,peer_key' })
    .then(() => {}, (err) => console.error('Cache write failed (insights):', err));
}

/** Store competitive cards in cache */
export async function cacheCompetitive(symbol: string, peerSymbols: string[], highlights: FinancialHighlight[]): Promise<void> {
  if (!supabase) return;
  const peerKey = makePeerKey(peerSymbols);
  await supabase
    .from('briefing_cache')
    .upsert({
      symbol: symbol.toUpperCase(),
      card_type: 'competitive',
      peer_key: peerKey,
      data: highlights,
    }, { onConflict: 'symbol,card_type,peer_key' })
    .then(() => {}, (err) => console.error('Cache write failed (competitive):', err));
}

/** Store strategic ideas in cache */
export async function cacheStrategicIdeas(symbol: string, ideas: Idea[]): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('briefing_cache')
    .upsert({
      symbol: symbol.toUpperCase(),
      card_type: 'strategic_ideas',
      peer_key: '',
      data: ideas,
    }, { onConflict: 'symbol,card_type,peer_key' })
    .then(() => {}, (err) => console.error('Cache write failed (strategic_ideas):', err));
}
