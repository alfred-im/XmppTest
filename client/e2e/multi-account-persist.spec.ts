import { test, expect } from '@playwright/test';

import {
  enableFlutterAccessibility,
  readSavedAccountsManifest,
} from './helpers/flutter-a11y';

const BASE_URL = process.env.ALFRED_BASE_URL ?? 'http://localhost:8080/';

/** Viewport stretto: evita bug ListView unbounded in layout wide (sidebar desktop). */
test.use({ viewport: { width: 390, height: 844 } });

test.setTimeout(300_000);

const AGENT1 = {
  email: 'agadriel.sexpositive+alfredagent1@gmail.com',
  password: 'AlfredAgentDbg1!',
  userId: 'efd885fe-b36e-48fc-a796-0e3f153e40d6',
  displayName: 'Alfred Agent 1',
};

const AGENT2 = {
  email: 'agadriel.sexpositive+alfredagent2@gmail.com',
  password: 'AlfredAgentDbg2!',
  userId: '0a81f785-173c-4f1c-b5df-3937086a2482',
  displayName: 'Alfred Agent 2',
};

async function openAccountDrawer(page: import('@playwright/test').Page) {
  await page.locator('flt-semantics[role="button"]').first().click({ timeout: 15_000 });
  await page.waitForTimeout(500);
}

async function clickAggiungiAccount(page: import('@playwright/test').Page) {
  await openAccountDrawer(page);
  await page.getByText('Aggiungi account').click();
}

async function loginInAuthForm(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
) {
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Accedi' }).click();
}

function expectTwoDistinctTokens(manifest: { userId: string; refreshToken: string }[]) {
  const tokens = manifest.map((e) => e.refreshToken);
  expect(
    new Set(tokens).size,
    `BUG: stesso refreshToken su account diversi — ${JSON.stringify(manifest)}`,
  ).toBe(manifest.length);
}

test('multi-account: manifest con 2 token e UI dopo F5', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForTimeout(5000);
  await enableFlutterAccessibility(page);

  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible({
    timeout: 60_000,
  });
  await loginInAuthForm(page, AGENT1.email, AGENT1.password);
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeHidden({
    timeout: 90_000,
  });
  await page.waitForTimeout(3000);

  await clickAggiungiAccount(page);
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible({
    timeout: 15_000,
  });
  await loginInAuthForm(page, AGENT2.email, AGENT2.password);
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeHidden({
    timeout: 90_000,
  });
  await page.waitForTimeout(5000);

  const manifestBeforeReload = await readSavedAccountsManifest(page);
  expect(manifestBeforeReload, 'manifest assente prima del reload').not.toBeNull();
  expect(manifestBeforeReload!.length).toBe(2);
  expect(new Set(manifestBeforeReload!.map((a) => a.userId))).toEqual(
    new Set([AGENT1.userId, AGENT2.userId]),
  );
  for (const entry of manifestBeforeReload!) {
    expect(entry.refreshToken.length).toBeGreaterThan(5);
  }
  // Nota: se fallisce qui, due account condividono lo stesso refreshToken (bug persistenza).
  expectTwoDistinctTokens(manifestBeforeReload!);

  await openAccountDrawer(page);
  await expect(page.getByText('Altri account')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(AGENT1.displayName)).toBeVisible();
  await page.keyboard.press('Escape');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForTimeout(10000);
  await enableFlutterAccessibility(page);

  const manifestAfterReload = await readSavedAccountsManifest(page);
  expect(manifestAfterReload, 'manifest assente dopo reload').not.toBeNull();
  expect(manifestAfterReload!.length).toBe(2);
  expect(new Set(manifestAfterReload!.map((a) => a.userId))).toEqual(
    new Set([AGENT1.userId, AGENT2.userId]),
  );

  await openAccountDrawer(page);
  await expect(page.getByText('Altri account')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(AGENT1.displayName)).toBeVisible();

  expect(errors, `errori JS: ${errors.join('; ')}`).toEqual([]);
});
