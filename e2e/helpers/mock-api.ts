import { type Page } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";

const FIXTURES = join(import.meta.dirname, "..", "fixtures");

function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), "utf-8");
}

export interface RouteOverride {
  status?: number;
  body?: string;
  delay?: number;
  /** For stateful mocking: called with call count, return null to use default */
  handler?: (
    callCount: number,
  ) => { status: number; body: string } | null;
}

export type Overrides = {
  [endpoint: string]: RouteOverride;
};

/**
 * Set up mock API routes for all /.netlify/functions/* endpoints.
 * Clears localStorage before each test.
 */
export async function setupMockApi(page: Page, overrides: Overrides = {}) {
  // Clear localStorage on page load
  await page.addInitScript(() => localStorage.clear());

  const callCounts: Record<string, number> = {};

  const defaults: Record<string, { body: string; contentType: string }> = {
    "analyze-company": {
      body: fixture("analyze-company.json"),
      contentType: "application/json",
    },
    "generate-briefing": {
      body: fixture("generate-briefing.txt"),
      contentType: "text/plain",
    },
    "fetch-peers": {
      body: fixture("fetch-peers.json"),
      contentType: "application/json",
    },
    "fetch-peer-data": {
      body: fixture("fetch-peer-data.json"),
      contentType: "application/json",
    },
    "generate-ideas": {
      body: fixture("generate-ideas.json"),
      contentType: "application/json",
    },
    "inject-ideas": {
      body: fixture("inject-ideas.json"),
      contentType: "application/json",
    },
    "generate-company-ideas": {
      body: fixture("generate-company-ideas.txt"),
      contentType: "text/plain",
    },
    "generate-narrative": {
      body: fixture("generate-narrative.json"),
      contentType: "application/json",
    },
    "search-company": {
      body: "[]",
      contentType: "application/json",
    },
  };

  await page.route("**/.netlify/functions/*", async (route) => {
    const url = route.request().url();
    // Extract endpoint name from URL (handle query params)
    const match = url.match(/\.netlify\/functions\/([a-z-]+)/);
    if (!match) {
      await route.abort();
      return;
    }

    const endpoint = match[1];
    callCounts[endpoint] = (callCounts[endpoint] || 0) + 1;

    const override = overrides[endpoint];
    const def = defaults[endpoint];

    if (!def) {
      await route.abort();
      return;
    }

    // Check for stateful handler override
    if (override?.handler) {
      const result = override.handler(callCounts[endpoint]);
      if (result) {
        if (override.delay) await delay(override.delay);
        await route.fulfill({
          status: result.status,
          contentType: def.contentType,
          body: result.body,
        });
        return;
      }
    }

    const status = override?.status ?? 200;
    const body = override?.body ?? def.body;
    const ms = override?.delay ?? 0;

    if (ms > 0) await delay(ms);

    await route.fulfill({
      status,
      contentType: def.contentType,
      body,
    });
  });

  // No need to block Supabase — supabase.ts exports null when env vars are missing
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
