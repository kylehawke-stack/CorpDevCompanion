import { test, expect } from "@playwright/test";
import { setupMockApi } from "../helpers/mock-api.ts";

test.describe("Skip peers: alternate flow without peer data", () => {
  test("skip peer selection → briefing renders without peer benchmarking", async ({
    page,
  }) => {
    await setupMockApi(page);
    await page.goto("/");

    // Welcome → HowItWorks
    await page.click("text=Start M&A Analysis");

    // Wait for fetches to complete
    await expect(
      page.locator(
        'button:has-text("Begin Step 3: Strategic Priorities")',
      ),
    ).toBeVisible({ timeout: 15_000 });
    await page.click('button:has-text("Begin Step 3: Strategic Priorities")');

    // PeerSelectionPage — click "Skip peer analysis"
    await expect(page.locator("text=Select Competitors").first()).toBeVisible();
    await page.click("text=Skip peer analysis");

    // BriefingPage should render directly
    await expect(
      page.locator("text=Hamilton Beach Brands Holding Company"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("text=Intelligence Briefing")).toBeVisible();

    // CTA should say "Begin Strategic Prioritization" (NOT "Continue to Peer Benchmarking")
    const cta = page.locator(
      'button:has-text("Begin Strategic Prioritization")',
    );
    await expect(cta).toBeVisible({ timeout: 10_000 });
    await expect(cta).toBeEnabled();

    // "Continue to Peer Benchmarking" should NOT be visible
    await expect(
      page.locator('button:has-text("Continue to Peer Benchmarking")'),
    ).not.toBeVisible();

    // Click Begin Strategic Prioritization → should go directly to voting
    await cta.click();

    // Should be on VotePage step 1 (no peer benchmarking step)
    await expect(
      page.locator("text=What is more important to our M&A strategy?"),
    ).toBeVisible({ timeout: 10_000 });
  });
});
