import { expect, type Page } from '@playwright/test';

import {
  enableFlutterAccessibility,
  readSavedAccountsManifest,
  type ManifestEntry,
} from './flutter-a11y';

export const BASE_URL =
  process.env.ALFRED_BASE_URL ?? 'https://alfred-im.github.io/XmppTest/';

export const ACCOUNT1 = {
  email:
    process.env.ALFRED_ACCOUNT1_EMAIL ??
    'agadriel.sexpositive+alfredagent1@gmail.com',
  password: process.env.ALFRED_ACCOUNT1_PASSWORD ?? 'AlfredAgentDbg1!',
  username: process.env.ALFRED_ACCOUNT1_USERNAME ?? 'alfredagent1',
};

export const ACCOUNT2 = {
  email:
    process.env.ALFRED_ACCOUNT2_EMAIL ??
    'agadriel.sexpositive+alfredagent2@gmail.com',
  password: process.env.ALFRED_ACCOUNT2_PASSWORD ?? 'AlfredAgentDbg2!',
  username: process.env.ALFRED_ACCOUNT2_USERNAME ?? 'alfredagent2',
};

export async function clearAppData(page: Page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForTimeout(8000);
  await enableFlutterAccessibility(page);
}

export async function openAccountDrawer(page: Page) {
  await page
    .locator('flt-semantics[role="button"]')
    .first()
    .click({ timeout: 20_000 });
  await page.waitForTimeout(500);
}

export async function closeDrawerIfOpen(page: Page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

export async function clickAggiungiAccount(page: Page) {
  await openAccountDrawer(page);
  await page.getByText('Aggiungi account').click();
}

export async function loginInAuthForm(
  page: Page,
  email: string,
  password: string,
) {
  const emailField = page.getByRole('textbox', { name: 'Email' });
  await emailField.click();
  await emailField.fill(email);
  await page.getByLabel('Password', { exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Accedi' }).click();
  await page.waitForFunction(
    () => {
      const raw = localStorage.getItem('flutter.alfred_saved_accounts');
      return raw != null && raw.length > 20;
    },
    { timeout: 120_000 },
  );
  await page.waitForTimeout(2000);
  await enableFlutterAccessibility(page);
}

export async function expectLoggedInShell(page: Page) {
  await expect(page.getByText('Nessun account aperto')).not.toBeVisible({
    timeout: 90_000,
  });
}

/** Con 2+ account in RAM la sidebar mobile mostra «Altri account». */
export async function expectMultiAccountList(page: Page, visible: boolean) {
  await openAccountDrawer(page);
  const section = page.getByText('Altri account');
  if (visible) {
    await expect(section).toBeVisible({ timeout: 30_000 });
  } else {
    await expect(section).not.toBeVisible({ timeout: 10_000 });
  }
  await closeDrawerIfOpen(page);
}

export function expectManifestCount(
  manifest: { userId: string; refreshToken: string }[] | null,
  count: number,
) {
  expect(manifest, 'manifest assente').not.toBeNull();
  expect(manifest!.length, `manifest: ${JSON.stringify(manifest)}`).toBe(count);
  if (count >= 2) {
    const tokens = manifest!.map((e) => e.refreshToken);
    expect(
      new Set(tokens).size,
      `refreshToken duplicati: ${JSON.stringify(manifest)}`,
    ).toBe(count);
  }
}

export function manifestEntryForUsername(
  manifest: ManifestEntry[],
  username: string,
): ManifestEntry {
  const entry = manifest.find((e) => e.username === username);
  expect(
    entry,
    `manifest senza username ${username}: ${JSON.stringify(manifest)}`,
  ).toBeDefined();
  return entry!;
}

export type TwoAccountSetup = {
  account1: ManifestEntry;
  account2: ManifestEntry;
};

/** Login account 1, aggiunge account 2; al termine il focus è su account 2. */
export async function setupTwoAccounts(page: Page): Promise<TwoAccountSetup> {
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

  const manifest = (await readSavedAccountsManifest(page))!;
  return {
    account1: manifestEntryForUsername(manifest, ACCOUNT1.username),
    account2: manifestEntryForUsername(manifest, ACCOUNT2.username),
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Pulsante account nel drawer (ha @username), distinto dalle righe inbox. */
function drawerAccountButton(page: Page, displayName: string) {
  const drawer = page.getByRole('group').filter({ hasText: 'Altri account' });
  return drawer.getByRole('button', {
    name: new RegExp(escapeRegExp(displayName)),
  });
}

/** Card profilo attivo nel drawer (group con nome accessibile). */
function activeAccountGroup(page: Page, displayName: string) {
  return page.getByRole('group', {
    name: new RegExp(escapeRegExp(displayName)),
  });
}

async function expectFocusedUserId(page: Page, userId: string) {
  await expect
    .poll(async () =>
      page.evaluate((id) => {
        const raw = localStorage.getItem('flutter.alfred_focus_user_id');
        if (!raw) return false;
        let value: unknown = raw;
        while (typeof value === 'string' && value.startsWith('"')) {
          value = JSON.parse(value);
        }
        return value === id;
      }, userId),
    )
    .toBe(true);
}

/** Riga conversazione in inbox (esclude i pulsanti account nel drawer). */
function inboxPeerButton(page: Page, displayName: string) {
  return page
    .getByRole('button', { name: new RegExp(escapeRegExp(displayName)) })
    .filter({ hasNotText: /@/ });
}

/**
 * Cambia focus account dal drawer mobile.
 * Non usare `.first()` su tutta la pagina: dopo un invio, l'inbox del mittente
 * ha già una riga con il nome del destinatario e Playwright cliccherebbe quella.
 */
export async function switchToAccountByDisplayName(
  page: Page,
  displayName: string,
  userId?: string,
  options?: { reloadAfter?: boolean },
) {
  await openAccountDrawer(page);

  const otherAccount = drawerAccountButton(page, displayName);
  if ((await otherAccount.count()) > 0) {
    await otherAccount.first().click({ timeout: 30_000 });
    await page.waitForTimeout(2000);
    await enableFlutterAccessibility(page);
    await closeDrawerIfOpen(page);
  } else {
    await expect(
      activeAccountGroup(page, displayName).first(),
      `account «${displayName}» non trovato nel drawer`,
    ).toBeVisible({ timeout: 10_000 });
    await closeDrawerIfOpen(page);
  }

  if (userId) {
    await expectFocusedUserId(page, userId);
  }

  // Conferma focus nel drawer (profilo attivo, non più sotto «Altri account»).
  await openAccountDrawer(page);
  await expect(
    activeAccountGroup(page, displayName).first(),
    `focus non passato a ${displayName}`,
  ).toBeVisible({ timeout: 10_000 });
  await expect(drawerAccountButton(page, displayName)).toHaveCount(0);
  await closeDrawerIfOpen(page);

  if (options?.reloadAfter && userId) {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForTimeout(5000);
    await enableFlutterAccessibility(page);
    await expectFocusedUserId(page, userId);
  }
}

export async function waitForChatInput(page: Page) {
  const field = page
    .getByRole('textbox', { name: /Scrivi un messaggio/i })
    .or(page.locator('flt-semantics[role="textbox"]').last());
  await expect(field).toBeVisible({ timeout: 30_000 });
  return field;
}

export async function composeNewMessage(page: Page, peerUsername: string) {
  await page.getByRole('button', { name: 'Nuovo messaggio' }).click({
    timeout: 20_000,
  });
  const address = page.getByRole('textbox', { name: 'Indirizzo' });
  await address.click();
  await address.fill(peerUsername);
  await page.getByRole('button', { name: 'Continua' }).click();
  await waitForChatInput(page);
}

export async function sendChatMessage(page: Page, body: string) {
  await expect(
    page.getByText(/cannot message yourself|messaggio a te stesso/i),
  ).not.toBeVisible({ timeout: 2_000 });
  const field = await waitForChatInput(page);
  await field.click();
  await field.pressSequentially(body, { delay: 25 });
  await field.press('Enter');
  await expect(
    page.getByText(/cannot message yourself|PostgrestException/i),
  ).not.toBeVisible({ timeout: 5_000 });
  // I bubble in a11y sono spesso in un unico `group` — match parziale, non exact.
  await expect(page.getByText(body)).toBeVisible({ timeout: 60_000 });
}

export async function openPeerInInbox(
  page: Page,
  displayName: string,
  options?: { username?: string },
) {
  await expect(page.getByRole('button', { name: 'Nuovo messaggio' })).toBeVisible(
    { timeout: 15_000 },
  );

  const row = inboxPeerButton(page, displayName);
  if ((await row.count()) > 0) {
    await row.first().click();
  } else if (options?.username) {
    await composeNewMessage(page, options.username);
  } else {
    await expect(
      row.first(),
      `inbox senza conversazione con ${displayName}`,
    ).toBeVisible({ timeout: 30_000 });
  }
  await waitForChatInput(page);
}

export async function backToInboxFromChat(page: Page) {
  await page.locator('flt-semantics[role="button"]').first().click();
  await expect(page.getByRole('button', { name: 'Nuovo messaggio' })).toBeVisible(
    { timeout: 15_000 },
  );
}

export async function expectChatContains(
  page: Page,
  bodies: string[],
  options?: { absent?: string[] },
) {
  for (const body of bodies) {
    await expect(page.getByText(body)).toBeVisible({ timeout: 30_000 });
  }
  for (const body of options?.absent ?? []) {
    await expect(page.getByText(body)).not.toBeVisible({ timeout: 5_000 });
  }
}

/**
 * Dopo un invio dall'altro account: cambia focus, apre la chat col mittente
 * e verifica che il messaggio ricevuto sia visibile in UI.
 */
export async function expectReceivedMessageOnAccount(
  page: Page,
  recipient: { displayName: string; userId: string },
  sender: { displayName: string; username: string },
  body: string,
) {
  await switchToAccountByDisplayName(
    page,
    recipient.displayName,
    recipient.userId,
    { reloadAfter: true },
  );

  const peerRow = inboxPeerButton(page, sender.displayName);
  try {
    await expect(
      peerRow.first(),
      `inbox di ${recipient.displayName} senza chat con ${sender.displayName}`,
    ).toBeVisible({ timeout: 20_000 });
    await peerRow.first().click();
  } catch {
    await composeNewMessage(page, sender.username);
  }

  await waitForChatInput(page);
  await expectChatContains(page, [body]);
}
