import { test, expect } from "@playwright/test";
import { setupMockApi } from "../helpers/mock-api.ts";

test.describe("Fast clickthrough: user races ahead of API responses", () => {
  test("loading state shown while briefing resolves", async ({ page }) => {
    await setupMockApi(page, {
      // Slow briefing — user will arrive at peer selection before it finishes
      "generate-briefing": { delay: 4000 },
      // Peer data resolves quickly
      "fetch-peer-data": { delay: 200 },
    });

    await page.goto("/");

    // Quick-click through Welcome
    await page.click("text=Start M&A Analysis");

    // HowItWorksPage — click Continue immediately (before fetches finish)
    // The button should say "Continue" (not "Begin Step 3") since fetchReady is false
    const continueBtn = page.locator('button:has-text("Continue")');
    await expect(continueBtn).toBeVisible({ timeout: 5_000 });

    // Wait for fetches to complete — button text changes to "Begin Step 3"
    await expect(
      page.locator(
        'button:has-text("Begin Step 3: Strategic Priorities")',
      ),
    ).toBeVisible({ timeout: 15_000 });
    await page.click('button:has-text("Begin Step 3: Strategic Priorities")');

    // PeerSelectionPage — select 3 peers quickly
    await expect(page.locator("text=Select Competitors").first()).toBeVisible();
    await page.locator("text=SharkNinja").click();
    await page.locator("text=Spectrum Brands").click();
    await page.locator("text=iRobot").click();

    // Click select competitors
    await page.click('button:has-text("Select Competitors (3/")');

    // Should show loading state — "Preparing intelligence briefing..."
    // because the briefing hasn't resolved yet (4s delay)
    await expect(
      page.locator("text=Preparing intelligence briefing"),
    ).toBeVisible({ timeout: 5_000 });

    // Eventually BriefingPage should render with actual data
    await expect(
      page.locator("text=Hamilton Beach Brands Holding Company"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("text=Intelligence Briefing")).toBeVisible();

    // Ideas should have loaded — CTA should NOT say "Generating strategic options"
    const cta = page.locator(
      'button:has-text("Continue to Peer Benchmarking")',
    );
    await expect(cta).toBeEnabled({ timeout: 10_000 });

    // No error states
    await expect(
      page.locator("text=Failed to generate analysis"),
    ).not.toBeVisible();
  });
});
