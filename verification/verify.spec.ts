
import { test, expect } from '@playwright/test';

test('verify codex tabs', async ({ page }) => {
  await page.goto('http://localhost:3001');
  // Wait for the game to load by looking for the "Board Ship" button.
  await page.click('button:has-text("Board Ship")');

  // Now we should be on the main screen. Wait for the header.
  await page.waitForSelector('h1:has-text("$tar Bucks")');

  // The "Things to do First" / "Acknowledge Directive" screen might be up.
  const ackButton = page.locator('button:has-text("ACKNOWLEDGE DIRECTIVE")');
  if (await ackButton.isVisible()) {
    await ackButton.click();
  }

  // Take a screenshot to debug
  await page.screenshot({ path: 'debug_before_codex_click.png' });

  // Click on the Codex button
  await page.click('button:has-text("Codex")');

  // The first time, it shows a tutorial popup. Click the "INITIATE SYSTEM" button.
  await page.click('button:has-text("INITIATE SYSTEM")');

  // Now the codex with tabs should be visible.
  await page.waitForSelector('h2:has-text("Sector Codex v5.9")');
  await expect(page.locator('h2:has-text("Sector Codex v5.9")')).toBeVisible();

  // Also verify one of the section titles is present.
  await expect(page.locator('h3:has-text("The Rusty Redeemer")')).toBeVisible();

  await page.screenshot({ path: 'codex.png' });
});
