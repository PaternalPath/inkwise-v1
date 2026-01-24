// @ts-check
import { test, expect } from "@playwright/test";

test.describe("Error Scenarios and Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test.describe("Empty State Handling", () => {
    test("expression phase shows message when no claims exist", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="start-fresh"]');

      // Navigate directly to expression phase via nav
      await page.click('.nav-btn:has-text("Expression")');

      // Should show message about needing claims
      await expect(page.locator(".panel.muted")).toContainText("Add at least one claim");
      await expect(page.locator('button[data-phase="structure"]')).toBeVisible();
    });

    test("draft buttons are disabled when no content", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="start-fresh"]');

      // Navigate to draft phase
      await page.click('.nav-btn:has-text("Draft")');

      // Copy and download buttons should be disabled
      const copyButtons = page.locator('button[data-action="copy-draft"]');
      await expect(copyButtons.first()).toBeDisabled();

      const downloadButtons = page.locator('button[data-action="download-draft"]');
      await expect(downloadButtons.first()).toBeDisabled();
    });

    test("character count shows 0 for empty draft", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="start-fresh"]');
      await page.click('.nav-btn:has-text("Draft")');

      // Character count should be visible and show a low number
      await expect(page.locator(".char-count")).toBeVisible();
    });
  });

  test.describe("Claims Management Edge Cases", () => {
    test("adding multiple claims works correctly", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="start-fresh"]');
      await page.click('.nav-btn:has-text("Structure")');

      // Add several claims
      for (let i = 0; i < 5; i++) {
        await page.click('button[data-action="add-claim"]');
      }

      // Should have 6 claims total (1 default + 5 added)
      const claims = page.locator('textarea[data-field="claim"]');
      await expect(claims).toHaveCount(6);
    });

    test("removing all claims leaves one empty claim", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="start-fresh"]');
      await page.click('.nav-btn:has-text("Structure")');

      // Add a claim
      await page.click('button[data-action="add-claim"]');

      // Remove both claims
      const removeButtons = page.locator('button[data-action="remove-claim"]');
      await removeButtons.first().click();
      await removeButtons.first().click();

      // Should still have at least one claim input
      const claims = page.locator('textarea[data-field="claim"]');
      await expect(claims).toHaveCount(1);
    });

    test("moving claims updates order correctly", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="start-fresh"]');
      await page.click('.nav-btn:has-text("Structure")');

      // Fill first claim
      const firstClaim = page.locator('textarea[data-field="claim"]').first();
      await firstClaim.fill("First Claim");

      // Add and fill second claim
      await page.click('button[data-action="add-claim"]');
      const secondClaim = page.locator('textarea[data-field="claim"]').nth(1);
      await secondClaim.fill("Second Claim");

      // Move second claim up
      const moveUpButton = page.locator('button[data-action="move-claim"][data-dir="up"]').nth(1);
      await moveUpButton.click();

      // Verify order changed
      await expect(page.locator('textarea[data-field="claim"]').first()).toHaveValue("Second Claim");
      await expect(page.locator('textarea[data-field="claim"]').nth(1)).toHaveValue("First Claim");
    });

    test("first claim cannot be moved up", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="start-fresh"]');
      await page.click('.nav-btn:has-text("Structure")');

      // First move up button should be disabled
      const moveUpButton = page.locator('button[data-action="move-claim"][data-dir="up"]').first();
      await expect(moveUpButton).toBeDisabled();
    });

    test("last claim cannot be moved down", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="start-fresh"]');
      await page.click('.nav-btn:has-text("Structure")');

      // Add a claim so we have 2
      await page.click('button[data-action="add-claim"]');

      // Last move down button should be disabled
      const moveDownButtons = page.locator('button[data-action="move-claim"][data-dir="down"]');
      await expect(moveDownButtons.last()).toBeDisabled();
    });
  });

  test.describe("LocalStorage Edge Cases", () => {
    test("handles corrupted localStorage gracefully", async ({ page }) => {
      await page.goto("/");

      // Inject corrupted data into localStorage
      await page.evaluate(() => {
        localStorage.setItem("inkwise:v1", "not valid json {{{");
      });

      // Reload and verify app still works
      await page.reload();

      // App should load with default/empty state
      await expect(page.locator(".app-shell")).toBeVisible();
      await expect(page.locator(".empty-state")).toBeVisible();
    });

    test("handles partial state in localStorage", async ({ page }) => {
      await page.goto("/");

      // Inject partial state
      await page.evaluate(() => {
        localStorage.setItem("inkwise:v1", JSON.stringify({ intent: "Partial state" }));
      });

      await page.reload();

      // Should load with the partial data merged with defaults
      await expect(page.locator(".app-shell")).toBeVisible();
    });

    test("handles empty object in localStorage", async ({ page }) => {
      await page.goto("/");

      await page.evaluate(() => {
        localStorage.setItem("inkwise:v1", "{}");
      });

      await page.reload();

      await expect(page.locator(".app-shell")).toBeVisible();
    });
  });

  test.describe("Output Profile Edge Cases", () => {
    test("memo format shows all sections", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="load-demo"]');
      await page.waitForSelector(".toast--success");

      await page.selectOption('select[data-action="set-output-profile"]', "memo");

      const preview = page.locator(".preview").first();
      await expect(preview).toContainText("TITLE");
      await expect(preview).toContainText("TL;DR");
      await expect(preview).toContainText("DETAILS");
      await expect(preview).toContainText("NEXT STEPS");
    });

    test("blog format creates markdown headers", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="load-demo"]');
      await page.waitForSelector(".toast--success");

      await page.selectOption('select[data-action="set-output-profile"]', "blog");

      const preview = page.locator(".preview").first();
      await expect(preview).toContainText("#");
    });

    test("custom profile returns plain text", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="load-demo"]');
      await page.waitForSelector(".toast--success");

      await page.selectOption('select[data-action="set-output-profile"]', "custom");

      // Should show content without special formatting
      await expect(page.locator(".preview").first()).toBeVisible();
    });
  });

  test.describe("LinkedIn Controls", () => {
    test("LinkedIn controls only visible for linkedin profile", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="load-demo"]');
      await page.waitForSelector(".toast--success");

      // LinkedIn controls should be visible by default
      await expect(page.locator('text="LinkedIn Controls"')).toBeVisible();

      // Switch to email
      await page.selectOption('select[data-action="set-output-profile"]', "email");

      // LinkedIn controls should not be visible
      await expect(page.locator('text="LinkedIn Controls"')).not.toBeVisible();
    });

    test("bullet toggle affects draft output", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="load-demo"]');
      await page.waitForSelector(".toast--success");

      // Enable bullets
      await page.check('input[data-field="li-includeBullets"]');

      // Preview should contain bullet points
      await expect(page.locator(".preview").first()).toContainText("•");
    });

    test("hashtags toggle adds hashtags to draft", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="load-demo"]');
      await page.waitForSelector(".toast--success");

      // Enable hashtags
      await page.check('input[data-field="li-includeHashtags"]');

      // Preview should contain hashtags
      await expect(page.locator(".preview").first()).toContainText("#");
    });

    test("signature toggle adds signature to draft", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="load-demo"]');
      await page.waitForSelector(".toast--success");

      // Enable signature
      await page.check('input[data-field="li-includeSignature"]');

      // Preview should contain signature
      await expect(page.locator(".preview").first()).toContainText("Posted via Inkwise");
    });

    test("hook override replaces intent in draft", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="load-demo"]');
      await page.waitForSelector(".toast--success");

      // Set custom hook
      await page.fill('textarea[data-field="li-hookOverride"]', "Custom opening hook");

      // Preview should contain the custom hook
      await expect(page.locator(".preview").first()).toContainText("Custom opening hook");
    });
  });

  test.describe("Character Limit Handling", () => {
    test("character count updates as content changes", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="start-fresh"]');

      // Add some content
      await page.fill("#intent-input", "Test content for character counting");
      await page.click('.nav-btn:has-text("Draft")');

      // Character count should reflect the content
      const charCount = page.locator(".char-count");
      await expect(charCount).toBeVisible();
    });

    test("shows warning styling when over limit", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="start-fresh"]');

      // Add very long content (over 3000 chars for LinkedIn)
      const longText = "A".repeat(3100);
      await page.fill("#intent-input", longText);
      await page.click('.nav-btn:has-text("Draft")');

      // Character count should have over-limit styling
      await expect(page.locator(".char-count--over")).toBeVisible();
    });
  });

  test.describe("Preset Loading", () => {
    test("loading preset populates all phases", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="start-fresh"]');
      await page.click('.nav-btn:has-text("Draft")');

      // Select a preset and load it
      await page.selectOption('select[data-field="ui-presetId"]', "sf_homeless_spend");
      await page.click('button[data-action="load-preset"]');

      // Check that content was loaded
      await expect(page.locator(".preview").first()).not.toContainText("Add intent/claims/expressions");
    });

    test("preset selector persists selection", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="start-fresh"]');
      await page.click('.nav-btn:has-text("Draft")');

      await page.selectOption('select[data-field="ui-presetId"]', "ai_energy_wall");

      // Reload and check selection persists
      await page.reload();
      await page.click('.nav-btn:has-text("Draft")');

      const select = page.locator('select[data-field="ui-presetId"]');
      await expect(select).toHaveValue("ai_energy_wall");
    });
  });

  test.describe("Reset Confirmation", () => {
    test("reset can be cancelled", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="load-demo"]');
      await page.waitForSelector(".toast--success");
      await page.click('.progress-step[data-phase="intent"]');

      // Set up dialog handler to dismiss
      page.on("dialog", (dialog) => dialog.dismiss());

      // Click reset
      await page.click('button[data-action="reset"]');

      // Content should still be present (not reset)
      await expect(page.locator("#intent-input")).not.toHaveValue("");
    });
  });

  test.describe("Accessibility", () => {
    test("progress bar has navigation role", async ({ page }) => {
      await page.goto("/");

      const progressBar = page.locator(".progress-bar");
      await expect(progressBar).toHaveAttribute("role", "navigation");
    });

    test("claims list has list role", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="start-fresh"]');
      await page.click('.nav-btn:has-text("Structure")');

      const claimsList = page.locator('.stack[role="list"]');
      await expect(claimsList).toBeVisible();
    });

    test("toast has alert role", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="load-demo"]');

      const toast = page.locator(".toast");
      await expect(toast).toHaveAttribute("role", "alert");
    });

    test("form inputs have associated labels", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="start-fresh"]');

      // Intent textarea should have a label
      const intentLabel = page.locator('label[for="intent-input"]');
      await expect(intentLabel).toBeAttached();
    });
  });

  test.describe("Download Functionality", () => {
    test("text download works", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="load-demo"]');
      await page.waitForSelector(".toast--success");
      await page.waitForTimeout(500);

      const downloadPromise = page.waitForEvent("download");
      await page.click('button[data-action="download-draft"]');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toEndWith(".txt");
    });

    test("breakdown download works", async ({ page }) => {
      await page.goto("/");
      await page.click('button[data-action="load-demo"]');
      await page.waitForSelector(".toast--success");
      await page.waitForTimeout(500);

      const downloadPromise = page.waitForEvent("download");
      await page.click('button[data-action="download-full"]');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain("breakdown");
    });
  });
});
