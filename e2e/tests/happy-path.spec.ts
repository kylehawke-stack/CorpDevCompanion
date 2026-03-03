import { test, expect } from "@playwright/test";
import { setupMockApi } from "../helpers/mock-api.ts";

/**
 * Cast votes by clicking the left card repeatedly.
 * The voting UI has a ~100ms animation delay between pairs.
 */
async function castVotes(page: import("@playwright/test").Page, count: number) {
  for (let i = 0; i < count; i++) {
    // Wait for a card with "Press A" text (left card is ready)
    const leftCard = page.locator("text=Press A").first();
    await leftCard.waitFor({ state: "visible", timeout: 5000 });
    // Click the card containing "Press A" — it's inside the left IdeaCard
    await leftCard.locator("..").locator("..").locator("..").click();
    // Small pause for animation
    await page.waitForTimeout(200);
  }
}

test.describe("Happy path: full flow", () => {
  test("Welcome → Voting → Results", async ({ page }) => {
    await setupMockApi(page);
    await page.goto("/");

    // ── Step 1: WelcomePage ──
    await expect(page.locator("text=Corp Dev Companion")).toBeVisible();
    await expect(page.locator("text=Hamilton Beach Brands")).toBeVisible();
    await page.click("text=Start M&A Analysis");

    // ── Step 2: HowItWorksPage ──
    await expect(
      page.locator("text=THE SYSTEM DOES THE HOMEWORK"),
    ).toBeVisible();
    // Wait for background fetches to complete
    await expect(
      page.locator("text=Analysis complete. Ready to proceed."),
    ).toBeVisible({ timeout: 15_000 });

    // CTA should now say "Begin Step 3"
    const continueBtn = page.locator(
      'button:has-text("Begin Step 3: Strategic Priorities")',
    );
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();

    // ── Step 3: PeerSelectionPage ──
    await expect(page.locator("text=Select Competitors")).toBeVisible();

    // Select 3 peers
    await page.locator("text=SharkNinja").click();
    await page.locator("text=Spectrum Brands").click();
    await page.locator("text=iRobot").click();

    // Click "Select Competitors (3/3-5)"
    const selectBtn = page.locator(
      'button:has-text("Select Competitors (3/")',
    );
    await expect(selectBtn).toBeEnabled();
    await selectBtn.click();

    // Should show loading spinner while fetching peer data
    await expect(
      page.locator("text=Fetching financial data for"),
    ).toBeVisible();

    // ── Step 4: BriefingPage ──
    await expect(
      page.locator("text=Hamilton Beach Brands Holding Company"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("text=Intelligence Briefing")).toBeVisible();
    // KPI strip should show revenue
    await expect(page.locator('text="$618M"')).toBeVisible();

    // Continue to Peer Benchmarking
    const peerBenchBtn = page.locator(
      'button:has-text("Continue to Peer Benchmarking")',
    );
    await expect(peerBenchBtn).toBeEnabled({ timeout: 10_000 });
    await peerBenchBtn.click();

    // ── Step 5: PeerBenchmarkPage ──
    await expect(page.locator("text=vs. Competitive Set")).toBeVisible({
      timeout: 10_000,
    });

    // Click "Begin Strategic Prioritization"
    const beginVotingBtn = page.locator(
      'button:has-text("Begin Strategic Prioritization")',
    );
    await expect(beginVotingBtn).toBeVisible();
    await beginVotingBtn.click();

    // ── Step 6: VotePage (Step 1 - Strategic Priorities) ──
    await expect(
      page.locator("text=What is more important to our M&A strategy?"),
    ).toBeVisible({ timeout: 10_000 });

    // Cast 25 votes to unlock step 2
    await castVotes(page, 25);

    // "Proceed to Market Segments" should appear
    const proceedStep2 = page.locator(
      'button:has-text("Proceed to Market Segments")',
    );
    await expect(proceedStep2).toBeVisible({ timeout: 10_000 });
    await proceedStep2.click();

    // ── Step 7: TransitionPage 1 ──
    await expect(page.locator("text=Step 3 Complete")).toBeVisible({
      timeout: 5_000,
    });
    // Wait for generate-ideas API call and transition to voting_step2
    await expect(
      page.locator("text=Which market segment is more attractive?"),
    ).toBeVisible({ timeout: 30_000 });

    // ── Step 8: VotePage (Step 2 - Market Segments) ──
    // Cast 25 votes (we need step2VoteCount to reach some threshold)
    await castVotes(page, 25);

    // View Results should be visible after 10+ votes
    const viewResults2 = page.locator('button:has-text("View Results")');
    await expect(viewResults2).toBeVisible({ timeout: 5_000 });

    // Proceed to company voting (need 50 votes for auto-unlock, let's cast more)
    await castVotes(page, 25);

    const proceedStep3 = page.locator(
      'button:has-text("Proceed to Company Voting")',
    );
    await expect(proceedStep3).toBeVisible({ timeout: 10_000 });
    await proceedStep3.click();

    // ── Step 9: TransitionPage 2 ──
    await expect(page.locator("text=Step 4 Complete")).toBeVisible({
      timeout: 5_000,
    });
    // Wait for generate-company-ideas and transition to voting_step3
    await expect(
      page.locator("text=Which company represents a better fit?"),
    ).toBeVisible({ timeout: 30_000 });

    // ── Step 10: VotePage (Step 3 - Companies) ──
    await castVotes(page, 10);

    // View Results should be visible
    const viewResults3 = page.locator('button:has-text("View Results")');
    await expect(viewResults3).toBeVisible({ timeout: 5_000 });
    await viewResults3.click();

    // ── Step 11: ResultsPage ──
    await expect(page.locator("text=CorpDev Companion")).toBeVisible();
    await expect(page.locator("text=Force-Ranked M&A")).toBeVisible();
    await expect(page.locator("text=Strategic Narrative")).toBeVisible();

    // Should not show any error states
    await expect(
      page.locator("text=Failed to generate analysis"),
    ).not.toBeVisible();
  });
});
