
import { test, expect } from '@playwright/test';

test('verify codex tabs', async ({ page }) => {
  await page.goto('http://localhost:3001');
  // Wait for the game to load
  await page.waitForSelector('h1:has-text("$tar Bucks")');

  // Click on the Codex button
  await page.click('button:has-text("Codex")');

  // The first time, it shows a tutorial popup. Click the "INITIATE SYSTEM" button.
  await page.click('button:has-text("INITIATE SYSTEM")');

  // Now the codex with tabs should be visible.
  // Click on the commodities tab
  await page.click('button:has-text("Commodities")');
  await page.screenshot({ path: '/home/jules/verification/codex_commodities.png' });

  // Click on the venues tab
  await page.click('button:has-text("Venues")');
  await page.screenshot({ path: '/home/jules/verification/codex_venues.png' });

  // Click on the encounters tab
  await page.click('button:has-text("Encounters")');
  await page.screenshot({ path: '/home/jules/verification/codex_encounters.png' });
});
