// @ts-check
import { test, expect } from "@playwright/test";

test.describe("Inkwise Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("app loads successfully", async ({ page }) => {
    await page.goto("/");

    // Check that the app shell is present
    await expect(page.locator(".app-shell")).toBeVisible();

    // Check that the brand title is present
    await expect(page.locator(".brand-title")).toHaveText("Inkwise");

    // Check that navigation is present
    await expect(page.locator(".nav")).toBeVisible();
  });

  test("shows empty state for first-time users", async ({ page }) => {
    await page.goto("/");

    // Check for empty state
    await expect(page.locator(".empty-state")).toBeVisible();
    await expect(page.locator(".empty-state-title")).toHaveText("Welcome to Inkwise");

    // Check for Load Demo button
    await expect(page.locator('button[data-action="load-demo"]')).toBeVisible();
  });

  test("load demo project works", async ({ page }) => {
    await page.goto("/");

    // Click Load Demo Project button
    await page.click('button[data-action="load-demo"]');

    // Wait for toast notification
    await expect(page.locator(".toast--success")).toBeVisible();

    // Check that we're now on the draft phase
    await expect(page.locator(".progress-step--active")).toContainText("Draft");

    // Check that demo content is loaded
    await expect(page.locator(".preview")).toContainText("writing tools");
  });

  test("navigate through workflow: Intent → Structure → Expression → Draft", async ({ page }) => {
    await page.goto("/");

    // Click "Start Fresh" to dismiss empty state
    await page.click('button[data-action="start-fresh"]');

    // Verify we're on Intent phase
    await expect(page.locator(".progress-step--active")).toContainText("Intent");

    // Fill in intent
    await page.fill("#intent-input", "Test intent for workflow");

    // Click continue to Structure
    await page.click('button[data-action="continue"][data-next="structure"]');

    // Verify we're on Structure phase
    await expect(page.locator(".progress-step--active")).toContainText("Structure");

    // Fill in a claim
    const claimTextarea = page.locator('textarea[data-field="claim"]').first();
    await claimTextarea.fill("First test claim");

    // Click continue to Expression
    await page.click('button[data-action="continue"][data-next="expression"]');

    // Verify we're on Expression phase
    await expect(page.locator(".progress-step--active")).toContainText("Expression");

    // Fill in an expression
    const expressionTextarea = page.locator('textarea[data-field="expression"]').first();
    await expressionTextarea.fill("This is the expression for the first claim.");

    // Click continue to Draft
    await page.click('button[data-action="continue"][data-next="draft"]');

    // Verify we're on Draft phase
    await expect(page.locator(".progress-step--active")).toContainText("Draft");

    // Verify the preview contains our content
    await expect(page.locator(".preview").first()).toContainText("Test intent");
  });

  test("progress indicator navigation works", async ({ page }) => {
    await page.goto("/");

    // Load demo to have content
    await page.click('button[data-action="load-demo"]');
    await page.waitForSelector(".toast--success");

    // Click on Intent in progress bar
    await page.click('.progress-step[data-phase="intent"]');
    await expect(page.locator(".progress-step--active")).toContainText("Intent");

    // Click on Structure
    await page.click('.progress-step[data-phase="structure"]');
    await expect(page.locator(".progress-step--active")).toContainText("Structure");

    // Click on Expression
    await page.click('.progress-step[data-phase="expression"]');
    await expect(page.locator(".progress-step--active")).toContainText("Expression");

    // Click on Draft
    await page.click('.progress-step[data-phase="draft"]');
    await expect(page.locator(".progress-step--active")).toContainText("Draft");
  });

  test("copy to clipboard shows success toast", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/");

    // Load demo project
    await page.click('button[data-action="load-demo"]');
    await page.waitForSelector(".toast--success");
    await page.waitForTimeout(500); // Wait for toast to disappear

    // Click copy button
    await page.click('button[data-action="copy-draft"]');

    // Verify success toast appears
    await expect(page.locator(".toast--success")).toContainText("Copied");
  });

  test("export project JSON works", async ({ page }) => {
    await page.goto("/");

    // Load demo project
    await page.click('button[data-action="load-demo"]');
    await page.waitForSelector(".toast--success");
    await page.waitForTimeout(500);

    // Set up download handler
    const downloadPromise = page.waitForEvent("download");

    // Click export project button
    await page.click('button[data-action="export-project"]');

    // Wait for download
    const download = await downloadPromise;

    // Verify filename contains inkwise_project
    expect(download.suggestedFilename()).toContain("inkwise_project");
    expect(download.suggestedFilename()).toEndWith(".json");
  });

  test("download markdown works", async ({ page }) => {
    await page.goto("/");

    // Load demo project
    await page.click('button[data-action="load-demo"]');
    await page.waitForSelector(".toast--success");
    await page.waitForTimeout(500);

    // Set up download handler
    const downloadPromise = page.waitForEvent("download");

    // Click download markdown button
    await page.click('button[data-action="download-md"]');

    // Wait for download
    const download = await downloadPromise;

    // Verify filename ends with .md
    expect(download.suggestedFilename()).toEndWith(".md");
  });

  test("output profile selection works", async ({ page }) => {
    await page.goto("/");

    // Load demo project
    await page.click('button[data-action="load-demo"]');
    await page.waitForSelector(".toast--success");

    // Change output profile to Email
    await page.selectOption('select[data-action="set-output-profile"]', "email");

    // Verify the preview updates (email format starts with "Subject:")
    await expect(page.locator(".preview").first()).toContainText("Subject:");

    // Change to X Thread
    await page.selectOption('select[data-action="set-output-profile"]', "xthread");

    // Verify the preview updates (X thread format has numbered posts)
    await expect(page.locator(".preview").first()).toContainText("1/");
  });

  test("state persists across page reloads", async ({ page }) => {
    await page.goto("/");

    // Start fresh and add content
    await page.click('button[data-action="start-fresh"]');
    await page.fill("#intent-input", "Persistence test intent");

    // Reload the page
    await page.reload();

    // Verify content persists
    await expect(page.locator("#intent-input")).toHaveValue("Persistence test intent");
  });

  test("reset clears all data", async ({ page }) => {
    await page.goto("/");

    // Load demo project
    await page.click('button[data-action="load-demo"]');
    await page.waitForSelector(".toast--success");

    // Navigate to Intent
    await page.click('.progress-step[data-phase="intent"]');

    // Set up dialog handler to accept
    page.on("dialog", (dialog) => dialog.accept());

    // Click reset button
    await page.click('button[data-action="reset"]');

    // Verify we're back to empty state
    await expect(page.locator(".empty-state")).toBeVisible();
  });
});
