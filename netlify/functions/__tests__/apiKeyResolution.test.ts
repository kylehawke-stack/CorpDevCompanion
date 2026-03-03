import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Tests that all Claude-calling Netlify functions read CLAUDE_API_KEY
 * before falling back to ANTHROPIC_API_KEY.
 *
 * This prevents the bug where Netlify's auto-injected ANTHROPIC_API_KEY
 * (from the AI extension) hijacks the user's own key.
 */

const FUNCTIONS_DIR = path.resolve(__dirname, '..');
const CLAUDE_CALLING_FUNCTIONS = [
  'generate-briefing.mts',
  'generate-ideas.mts',
  'generate-company-ideas.mts',
  'generate-narrative.mts',
  'inject-ideas.mts',
];

describe('API key resolution order', () => {
  for (const funcFile of CLAUDE_CALLING_FUNCTIONS) {
    it(`${funcFile} reads CLAUDE_API_KEY before ANTHROPIC_API_KEY`, () => {
      const filePath = path.join(FUNCTIONS_DIR, funcFile);
      const source = fs.readFileSync(filePath, 'utf-8');

      // Must contain the correct pattern: CLAUDE_API_KEY || ANTHROPIC_API_KEY
      const correctPattern = /process\.env\.CLAUDE_API_KEY\s*\|\|\s*process\.env\.ANTHROPIC_API_KEY/;
      expect(source).toMatch(correctPattern);
    });

    it(`${funcFile} does not read ANTHROPIC_API_KEY alone (without CLAUDE_API_KEY fallback)`, () => {
      const filePath = path.join(FUNCTIONS_DIR, funcFile);
      const source = fs.readFileSync(filePath, 'utf-8');

      // Find all env var reads for API keys
      const anthropicOnlyPattern = /process\.env\.ANTHROPIC_API_KEY(?!\s*;?\s*$)/g;
      const matches = source.match(anthropicOnlyPattern) || [];

      // Every occurrence of ANTHROPIC_API_KEY should be preceded by CLAUDE_API_KEY ||
      for (const _match of matches) {
        // The correct pattern must exist
        const correctPattern = /process\.env\.CLAUDE_API_KEY\s*\|\|\s*process\.env\.ANTHROPIC_API_KEY/;
        expect(source).toMatch(correctPattern);
      }
    });
  }
});
