// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Diagnosi e2e — tap push reale (notificationclick) + unread + parity UI/DB.
 *
 * Riproduce il percorso utente: A in focus scrive a B → notifica → tap → chat → chiudi → inbox.
 * Non è gate CI: dump esteso in stdout e attachment Playwright.
 *
 * Lancio (stack locale):
 *   cd client && bash scripts/run-push-e2e-local.sh -- e2e/push-tap-unread-diagnostic.spec.ts
 * Oppure con Flutter già su :8080:
 *   E2E_PUSH_REUSE_FLUTTER=1 bash scripts/test.sh e2e-push-local -- e2e/push-tap-unread-diagnostic.spec.ts
 */
import { test, expect } from '@playwright/test';

import {
  collectVisibleChatTexts,
  compareUiBodiesToDb,
  countUiNodesContainingBody,
  findDuplicateBodies,
} from './helpers/chat-ui';
import {
  attachDiagnosticLogCollector,
  dumpDiagnosticLogsOnFailure,
  formatDiagnosticLogsFooter,
  summarizePushDiagPhases,
} from './helpers/diagnostic-logs';
import { expectFocusedUserId, readFocusedUserId } from './helpers/focus';
import { configureLocalPushSettings } from './helpers/local-push-setup';
import {
  prepareLocalMessagingPair,
  setupTwoLocalAccounts,
} from './helpers/local-multi-account';
import { isLocalSupabaseStack } from './helpers/local-auth';
import {
  formatMailboxSnapshot,
  sendMessageToProfile,
  snapshotRecipientMailbox,
  waitForMessageInMailbox,
  waitForReadAt,
} from './helpers/mailbox-db';
import {
  attachPageErrorCollector,
} from './helpers/page-errors';
import {
  BASE_URL,
  backToInboxFromChat,
  composeNewMessage,
  sendChatMessage,
  switchToAccountByDisplayName,
  waitForChatInput,
} from './helpers/multi-account';
import {
  clickNotificationInServiceWorker,
  deliverPushInServiceWorker,
  ensurePushSubscriptionInDb,
  installPushTestEnvironment,
  readServiceWorkerDiagnostics,
} from './helpers/push';
import { E2E_TIMEOUT } from './helpers/timeouts';

test.use({
  viewport: { width: 390, height: 844 },
  permissions: ['notifications'],
  headless: false,
});
test.setTimeout(360_000);

let diagLogs: string[] = [];

test.beforeEach(({ page }) => {
  diagLogs = attachDiagnosticLogCollector(page);
});

test.afterEach(({}, testInfo) => {
  dumpDiagnosticLogsOnFailure(diagLogs, testInfo);
});

test.beforeAll(() => {
  test.skip(!isLocalSupabaseStack(), 'stack locale richiesto');
  test.skip(
    !(process.env.ALFRED_BASE_URL ?? 'http://localhost:8080/').match(
      /localhost|127\.0\.0\.1/,
    ),
    'ALFRED_BASE_URL locale richiesto',
  );
  configureLocalPushSettings();
});

function logSection(title: string, body: string) {
  console.log(`\n${'='.repeat(72)}\n${title}\n${'='.repeat(72)}\n${body}`);
}

test('diagnosi push tap — notificationclick, UI/DB parity, unread dopo chiusura', async ({
  page,
  context,
}, testInfo) => {
  const pageErrors = attachPageErrorCollector(page);
  const stamp = Date.now();
  const priorMsg = `diag-prior-${stamp}`;
  const newMsg = `diag-push-${stamp}`;
  const diagFooter = () => formatDiagnosticLogsFooter(diagLogs);

  const { acct1, acct2, session1, session2 } =
    await prepareLocalMessagingPair(`ptud${stamp}`, `ptudb${stamp}`);

  // Storia mailbox via API (come messaggi precedenti nel thread reale)
  await sendMessageToProfile({
    accessToken: session1.accessToken,
    recipientProfileId: acct2.userId,
    body: priorMsg,
    clientMessageId: `prior-${stamp}`,
  });
  await waitForMessageInMailbox({
    accessToken: session2.accessToken,
    peerProfileId: acct1.userId,
    body: priorMsg,
  });

  const dbBeforeBrowser = await snapshotRecipientMailbox({
    accessToken: session2.accessToken,
    viewerUserId: acct2.userId,
    peerProfileId: acct1.userId,
  });
  logSection('DB PRIMA BROWSER', formatMailboxSnapshot('recipient B', dbBeforeBrowser));

  await page.goto(BASE_URL, {
    waitUntil: 'domcontentloaded',
    timeout: E2E_TIMEOUT.boot,
  });
  await installPushTestEnvironment(page, context, BASE_URL);

  const { account1, account2 } = await setupTwoLocalAccounts(
    page,
    acct1,
    acct2,
  );

  // Focus A, chat verso B, invio nuovo messaggio (percorso UI come utente)
  await switchToAccountByDisplayName(
    page,
    account1.displayName!,
    account1.userId,
  );
  await expectFocusedUserId(page, account1.userId);
  await composeNewMessage(page, acct2.username);
  await sendChatMessage(page, newMsg);

  await waitForMessageInMailbox({
    accessToken: session2.accessToken,
    peerProfileId: acct1.userId,
    body: newMsg,
  });

  const dbAfterSend = await snapshotRecipientMailbox({
    accessToken: session2.accessToken,
    viewerUserId: acct2.userId,
    peerProfileId: acct1.userId,
  });
  logSection('DB DOPO INVIO UI', formatMailboxSnapshot('recipient B', dbAfterSend));

  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.register('push_sw.js');
    await navigator.serviceWorker.ready;
    await reg.pushManager.subscribe({ userVisibleOnly: true });
  });

  await ensurePushSubscriptionInDb({
    page,
    accessToken: session2.accessToken,
    userId: acct2.userId,
  });

  await deliverPushInServiceWorker(page, {
    recipientUserId: acct2.userId,
    peerProfileId: acct1.userId,
    peerDisplayName: account1.displayName ?? acct1.username,
    recipientUsername: acct2.username,
    previewText: newMsg,
  });

  const swBefore = await readServiceWorkerDiagnostics(page);
  logSection('SW PRIMA TAP', JSON.stringify(swBefore, null, 2));

  const focusBeforeTap = await readFocusedUserId(page);
  logSection(
    'FOCUS PRIMA TAP',
    `focusedUserId=${focusBeforeTap} (atteso A=${acct1.userId})`,
  );

  const clickResult = await clickNotificationInServiceWorker(page);
  logSection('NOTIFICATIONCLICK', JSON.stringify(clickResult, null, 2));
  expect(clickResult.ok, JSON.stringify(clickResult)).toBe(true);

  // Scenario utente: chiusura rapida (prima che mark_read completi in alcuni casi live)
  await waitForChatInput(page);
  await backToInboxFromChat(page);

  const dbAfterFastClose = await snapshotRecipientMailbox({
    accessToken: session2.accessToken,
    viewerUserId: acct2.userId,
    peerProfileId: acct1.userId,
  });
  logSection(
    'DB DOPO CHIUSURA IMMEDIATA',
    formatMailboxSnapshot('recipient B', dbAfterFastClose),
  );

  // Riapri via secondo tap (o inbox) per parity UI — qui inbox row
  await page
    .getByRole('button', { name: new RegExp(account1.displayName ?? acct1.username) })
    .filter({ hasNotText: /@/ })
    .first()
    .click({ timeout: E2E_TIMEOUT.ui });
  await waitForChatInput(page);
  await page.waitForTimeout(1_500);

  const pushPhases = summarizePushDiagPhases(diagLogs);
  const focusAfterTap = await readFocusedUserId(page);
  const swAfter = await readServiceWorkerDiagnostics(page);
  logSection(
    'DOPO TAP + CHIUSURA IMMEDIATA + RIAPERTURA INBOX',
    [
      `focus=${focusAfterTap} (atteso B=${acct2.userId})`,
      `sw=${JSON.stringify(swAfter)}`,
      `push phases:\n${pushPhases.join('\n') || '(nessuna fase rilevante)'}`,
    ].join('\n'),
  );

  expect.soft(
    pushPhases.some((l) => l.includes('sw.message') || l.includes('open_chat.emit')),
    `tap deve propagare sw.message/open_chat.emit; ${diagFooter()}`,
  ).toBe(true);

  expect.soft(
    pushPhases.some((l) => l.includes('focus.ok')),
    `focus.ok atteso nei log; phases=${pushPhases.join(' | ')}`,
  ).toBe(true);

  const chatOpened = pushPhases.some((l) => l.includes('handler.chat_opened'));
  logSection(
    'FINDING handler.chat_opened',
    chatOpened
      ? 'presente — chat aperta dal handler push'
      : 'ASSENTE — possibile chiusura prima di handler.chat_opened (scenario unread?)',
  );

  expect.soft(
    focusAfterTap === acct2.userId,
    `focus atteso B dopo tap; got=${focusAfterTap}; ${diagFooter()}`,
  ).toBe(true);

  const uiBodiesOpen = await collectVisibleChatTexts(page);
  const dbBodies = dbAfterSend.messages.map((m) => m.body);
  const parityOpen = compareUiBodiesToDb({
    uiBodies: uiBodiesOpen,
    dbBodies,
    focusBody: newMsg,
  });
  const uiDupesOpen = findDuplicateBodies(uiBodiesOpen);
  const priorUiCount = countUiNodesContainingBody(uiBodiesOpen, priorMsg);
  const newUiCount = countUiNodesContainingBody(uiBodiesOpen, newMsg);

  logSection(
    'PARITY CHAT APERTA (UI vs DB)',
    [
      `ui bodies (${uiBodiesOpen.length}): ${JSON.stringify(uiBodiesOpen)}`,
      `db bodies (${dbBodies.length}): ${JSON.stringify(dbBodies)}`,
      `focus "${newMsg}" visible (includes): ${parityOpen.focusVisible}`,
      `ui nodes containing prior: ${priorUiCount}, new: ${newUiCount}`,
      `missing in UI: ${JSON.stringify(parityOpen.missingInUi)}`,
      `extra in UI (euristica): ${JSON.stringify(parityOpen.extraInUi.slice(0, 5))}${parityOpen.extraInUi.length > 5 ? '…' : ''}`,
      `UI duplicates (raw semantics): ${JSON.stringify(uiDupesOpen)}`,
      `DB duplicates: ${JSON.stringify(parityOpen.dbDuplicates)}`,
    ].join('\n'),
  );

  await testInfo.attach('parity-chat-open.json', {
    body: JSON.stringify(
      { uiBodiesOpen, dbBodies, parityOpen, uiDupesOpen },
      null,
      2,
    ),
    contentType: 'application/json',
  });

  expect.soft(
    parityOpen.focusVisible,
    `nuovo messaggio "${newMsg}" deve essere visibile in chat dopo tap`,
  ).toBe(true);

  logSection(
    'FINDING semantics duplicati',
    `nodi UI con prior=${priorUiCount}, new=${newUiCount} (Flutter web espone spesso N>1; segnale debole)`,
  );

  await expect.soft(page.getByText(newMsg)).toBeVisible({
    timeout: E2E_TIMEOUT.message,
  });
  await expect.soft(page.getByText(priorMsg)).toBeVisible({
    timeout: E2E_TIMEOUT.message,
  });

  await backToInboxFromChat(page);
  await page.waitForTimeout(2_000);

  const dbAfterClose = await snapshotRecipientMailbox({
    accessToken: session2.accessToken,
    viewerUserId: acct2.userId,
    peerProfileId: acct1.userId,
  });
  const readNew = await waitForReadAt({
    accessToken: session2.accessToken,
    peerProfileId: acct1.userId,
    body: newMsg,
    timeoutMs: 1_000,
  });
  const readPrior = await waitForReadAt({
    accessToken: session2.accessToken,
    peerProfileId: acct1.userId,
    body: priorMsg,
    timeoutMs: 1_000,
  });

  logSection(
    'DB DOPO CHIUSURA CHAT',
    [
      formatMailboxSnapshot('recipient B', dbAfterClose),
      `read_at "${newMsg}": ${readNew?.read_at ?? 'NULL (BUG unread?)'}`,
      `read_at "${priorMsg}": ${readPrior?.read_at ?? 'NULL'}`,
      `inbox unread_count: ${dbAfterClose.inboxRow?.unread_count ?? 'n/a'}`,
    ].join('\n\n'),
  );

  await testInfo.attach('mailbox-after-close.json', {
    body: JSON.stringify(dbAfterClose, null, 2),
    contentType: 'application/json',
  });

  const unreadStill = dbAfterClose.unreadIncoming.filter(
    (m) => m.body === newMsg || m.body === priorMsg,
  );
  expect.soft(
    unreadStill.length,
    `messaggi ancora unread dopo tap+chiusura: ${unreadStill.map((m) => m.body).join(', ')}`,
  ).toBe(0);

  expect.soft(
    (dbAfterFastClose.inboxRow?.unread_count ?? 0) === 0,
    `unread_count dopo chiusura immediata: ${dbAfterFastClose.inboxRow?.unread_count}`,
  ).toBe(true);

  expect.soft(
    (dbAfterClose.inboxRow?.unread_count ?? 0) === 0,
    `inbox unread_count atteso 0, got ${dbAfterClose.inboxRow?.unread_count}`,
  ).toBe(true);

  // Verifica anteprima inbox (UI) se il messaggio compare ancora come non letto
  const inboxShowsNew = await page
    .getByText(newMsg)
    .first()
    .isVisible()
    .catch(() => false);
  logSection(
    'INBOX UI',
    `anteprima "${newMsg}" visibile in lista: ${inboxShowsNew} (ok se letto)`,
  );

  logSection(
    'ALFRED DIAGNOSTIC LOGS (fasi push)',
    pushPhases.join('\n') || '(nessuna)',
  );
  logSection('ALFRED DIAGNOSTIC LOGS (completo)', diagFooter());

  await testInfo.attach('alfred-diag-logs.txt', {
    body: diagLogs.join('\n') || '(vuoto)',
    contentType: 'text/plain',
  });

  if (pageErrors.length > 0) {
    logSection('PAGE ERRORS', pageErrors.join('\n'));
  }
  expect.soft(pageErrors, 'errori pagina non benigni').toEqual([]);
});
