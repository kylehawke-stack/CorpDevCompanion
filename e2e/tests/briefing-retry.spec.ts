import { test, expect } from "@playwright/test";
import { setupMockApi } from "../helpers/mock-api.ts";
import { readFileSync } from "fs";
import { join } from "path";

const briefingBody = readFileSync(
  join(import.meta.dirname, "..", "fixtures", "generate-briefing.txt"),
  "utf-8",
);

test.describe("Briefing retry: first call fails, retry succeeds", () => {
  test("briefing recovers after initial failure", async ({ page }) => {
    await setupMockApi(page, {
      "generate-briefing": {
        handler: (callCount) => {
          if (callCount === 1) {
            // First call fails
            return { status: 500, body: '{"error":"Internal Server Error"}' };
          }
          // Second call succeeds
          return { status: 200, body: briefingBody };
        },
      },
    });

    await page.goto("/");

    // Navigate through Welcome → HowItWorks
    await page.click("text=Start M&A Analysis");

    // Wait for background fetches. Even though briefing fails, peers should load.
    // The "Continue" button will be usable once peers load.
    await expect(
      page.locator(
        'button:has-text("Begin Step 3: Strategic Priorities")',
      ),
    ).toBeVisible({ timeout: 15_000 });
    await page.click('button:has-text("Begin Step 3: Strategic Priorities")');

    // PeerSelection → select 3 peers
    await expect(page.locator("text=Select Competitors").first()).toBeVisible();
    await page.locator("text=SharkNinja").click();
    await page.locator("text=Spectrum Brands").click();
    await page.locator("text=iRobot").click();

    await page.click('button:has-text("Select Competitors (3/")');

    // PeerSelection should retry briefing with competitor data since first failed
    // Shows "Retrying briefing with competitor data..."
    await expect(
      page.locator("text=Retrying briefing with competitor data"),
    ).toBeVisible({ timeout: 10_000 });

    // BriefingPage should eventually render with ideas
    await expect(
      page.locator("text=Hamilton Beach Brands Holding Company"),
    ).toBeVisible({ timeout: 15_000 });

    // CTA should be enabled (ideas loaded from retry)
    const cta = page.locator(
      'button:has-text("Continue to Peer Benchmarking")',
    );
    await expect(cta).toBeEnabled({ timeout: 10_000 });
  });
});
