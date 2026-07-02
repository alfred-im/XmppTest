import { test, expect } from '@playwright/test';

import {
  backToInboxFromChat,
  ACCOUNT1,
  ACCOUNT2,
  expectChatContains,
  openPeerInInbox,
  sendChatMessage,
  setupTwoAccounts,
  switchToAccountByDisplayName,
} from './helpers/multi-account';
import {
  expectMessagePersistedBothSides,
  listPeerMessages,
  loginSupabase,
  waitForMessageInDb,
} from './helpers/supabase-api';

/**
 * Multi-account mobile: invio UI + verifica DB (list_peer_messages) + ricezione UI.
 *
 * Il gate principale è il DB: se il messaggio non è in Postgres, il test fallisce
 * subito — indipendentemente dall’UI Flutter.
 */
test.use({ viewport: { width: 390, height: 844 } });
test.setTimeout(300_000);

test('multi-account mobile: messaggio in DB e visibile dall’altro account', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  const stamp = Date.now();
  const msgFrom1 = `e2e-a1-${stamp}`;
  const msgFrom2 = `e2e-a2-${stamp}`;

  const { account1, account2 } = await setupTwoAccounts(page);
  const agent1Id = account1.userId;
  const agent2Id = account2.userId;

  // --- Invio da account 1 ---
  await switchToAccountByDisplayName(page, account1.displayName!);
  await openPeerInInbox(page, account2.displayName!);
  await sendChatMessage(page, msgFrom1);
  await backToInboxFromChat(page);

  // Gate DB: deve esistere per mittente e destinatario
  await expectMessagePersistedBothSides({
    body: msgFrom1,
    senderUserId: agent1Id,
    recipientUserId: agent2Id,
    senderEmail: ACCOUNT1.email,
    senderPassword: ACCOUNT1.password,
    recipientEmail: ACCOUNT2.email,
    recipientPassword: ACCOUNT2.password,
  });

  // --- Ricezione su account 2 ---
  await switchToAccountByDisplayName(page, account2.displayName!);

  // DB ancora una volta dal lato destinatario
  await waitForMessageInDb({
    viewerEmail: ACCOUNT2.email,
    viewerPassword: ACCOUNT2.password,
    peerProfileId: agent1Id,
    body: msgFrom1,
    expectedSenderId: agent1Id,
  });

  // Inbox deve elencare il peer corretto (non sé stesso)
  const inboxRowAgent1 = page
    .getByRole('button')
    .filter({ hasText: account1.displayName! });
  await expect(
    inboxRowAgent1,
    `inbox account2 deve mostrare chat con ${account1.displayName}, non con sé stesso`,
  ).toBeVisible({ timeout: 15_000 });

  await openPeerInInbox(page, account1.displayName!);
  await expectChatContains(page, [msgFrom1]);

  // --- Risposta da account 2 ---
  await sendChatMessage(page, msgFrom2);
  await backToInboxFromChat(page);

  await expectMessagePersistedBothSides({
    body: msgFrom2,
    senderUserId: agent2Id,
    recipientUserId: agent1Id,
    senderEmail: ACCOUNT2.email,
    senderPassword: ACCOUNT2.password,
    recipientEmail: ACCOUNT1.email,
    recipientPassword: ACCOUNT1.password,
  });

  // --- Account 1 ricarica la chat ---
  await switchToAccountByDisplayName(page, account1.displayName!);
  await waitForMessageInDb({
    viewerEmail: ACCOUNT1.email,
    viewerPassword: ACCOUNT1.password,
    peerProfileId: agent2Id,
    body: msgFrom2,
    expectedSenderId: agent2Id,
  });

  await openPeerInInbox(page, account2.displayName!);
  await expectChatContains(page, [msgFrom1, msgFrom2]);

  const asAgent1 = await loginSupabase(ACCOUNT1.email, ACCOUNT1.password);
  const dbAsAgent1 = await listPeerMessages(asAgent1.accessToken, agent2Id);
  expect(dbAsAgent1.map((m) => m.body)).toEqual(
    expect.arrayContaining([msgFrom1, msgFrom2]),
  );

  expect(errors, `errori JS: ${errors.join('; ')}`).toEqual([]);
});
