import { supabase } from './supabase.ts';

export interface BriefingCorrection {
  id?: string;
  target_symbol: string;
  card_label: string;
  card_index: number;
  issue_type: 'hallucination' | 'inaccurate' | 'incomplete' | 'other';
  original_text: string;
  user_note: string;
  created_at?: string;
}

/**
 * Fetch corrections for a target company.
 * Returns empty array in solo mode (no Supabase).
 */
export async function fetchCorrections(targetSymbol: string): Promise<BriefingCorrection[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('briefing_corrections')
    .select('*')
    .eq('target_symbol', targetSymbol.toUpperCase())
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data as BriefingCorrection[];
}

/**
 * Submit a correction. Fire-and-forget — errors logged but don't block UX.
 */
export async function submitCorrection(correction: Omit<BriefingCorrection, 'id' | 'created_at'>): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('briefing_corrections')
    .insert({
      target_symbol: correction.target_symbol.toUpperCase(),
      card_label: correction.card_label,
      card_index: correction.card_index,
      issue_type: correction.issue_type,
      original_text: correction.original_text,
      user_note: correction.user_note,
    });

  if (error) {
    console.error('submitCorrection failed:', error);
    return false;
  }
  return true;
}

/**
 * Format corrections into a text block for Claude's prompt context.
 */
export function formatCorrectionsForPrompt(corrections: BriefingCorrection[]): string {
  if (corrections.length === 0) return '';
  const lines = corrections.map(c =>
    `- [${c.card_label}] ${c.issue_type.toUpperCase()}: "${c.user_note}" (original: "${c.original_text.slice(0, 100)}")`
  );
  return `\nCORRECTIONS FROM PRIOR ANALYSES (avoid these mistakes):\n${lines.join('\n')}\n`;
}
