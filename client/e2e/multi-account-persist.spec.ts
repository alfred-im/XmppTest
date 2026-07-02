import { test, expect } from '@playwright/test';

import { enableFlutterAccessibility, readSavedAccountsManifest } from './helpers/flutter-a11y';
import {
  BASE_URL,
  ACCOUNT1,
  ACCOUNT2,
  clearAppData,
  clickAggiungiAccount,
  expectLoggedInShell,
  expectManifestCount,
  expectMultiAccountList,
  loginInAuthForm,
} from './helpers/multi-account';

/**
 * Flusso utente (mobile, Alpha):
 * 1. pulisci dati → login account 1
 * 2. aggiungi account 2 → compaiono 2 account (sezione «Altri account»)
 * 3. F5 → devono restare 2 account (se il 2° sparisce, «Altri account» non c’è)
 *
 * Account via env ALFRED_ACCOUNT{1,2}_{EMAIL,PASSWORD,USERNAME}
 * Default: alfredagent1/2. Per test1/test2 imposta email/password/username.
 */
test.use({ viewport: { width: 390, height: 844 } });
test.setTimeout(300_000);

test('multi-account mobile: dopo F5 restano 2 account in lista (flusso utente)', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await clearAppData(page);

  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible({
    timeout: 60_000,
  });
  await loginInAuthForm(page, ACCOUNT1.email, ACCOUNT1.password);
  await expectLoggedInShell(page);
  expectManifestCount(await readSavedAccountsManifest(page), 1);
  await expectMultiAccountList(page, false);

  await clickAggiungiAccount(page);
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible({
    timeout: 15_000,
  });
  await loginInAuthForm(page, ACCOUNT2.email, ACCOUNT2.password);
  await expectLoggedInShell(page);
  expectManifestCount(await readSavedAccountsManifest(page), 2);
  await expectMultiAccountList(page, true);

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForTimeout(12_000);
  await enableFlutterAccessibility(page);
  await expectLoggedInShell(page);

  expectManifestCount(await readSavedAccountsManifest(page), 2);
  await expectMultiAccountList(page, true);

  expect(errors, `errori JS: ${errors.join('; ')}`).toEqual([]);
});
