// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { test, expect } from '@playwright/test';

import {
  readBrowserPushState,
  waitForBrowserPushGranted,
  waitForPushSubscriptionInDb,
} from './helpers/push';
import {
  BASE_URL,
  clearAppData,
  loginInAuthForm,
  waitForLoggedInShell,
} from './helpers/multi-account';
import {
  createLocalConfirmedUser,
  isLocalSupabaseStack,
} from './helpers/local-auth';
import { loginSupabase } from './helpers/supabase-api';
import { E2E_TIMEOUT } from './helpers/timeouts';

/**
 * SURF-NOTIFICATIONS-001–003 su stack locale isolato (supabase start + client locale).
 * Non usa account live dell'utente (test1, alfredagent, ecc.).
 */
test.use({
  viewport: { width: 390, height: 844 },
  permissions: ['notifications'],
});
test.setTimeout(120_000);

test.beforeEach(() => {
  test.skip(
    !isLocalSupabaseStack(),
    'push-registration richiede SUPABASE_URL locale (supabase start)',
  );
  test.skip(
    !(process.env.ALFRED_BASE_URL ?? '').match(/localhost|127\.0\.0\.1/),
    'push-registration richiede ALFRED_BASE_URL locale',
  );
});

test('push locale: login, reload e subscription su DB', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  const user = await createLocalConfirmedUser('push');

  await context.grantPermissions(['notifications'], {
    origin: new URL(BASE_URL).origin,
  });

  await page.goto(BASE_URL, {
    waitUntil: 'domcontentloaded',
    timeout: E2E_TIMEOUT.boot,
  });
  await clearAppData(page);
  await loginInAuthForm(page, user.email, user.password);

  await page.reload({
    waitUntil: 'domcontentloaded',
    timeout: E2E_TIMEOUT.boot,
  });
  await waitForLoggedInShell(page);

  const stateBefore = await readBrowserPushState(page);
  test.skip(
    !stateBefore.supported,
    'Push API non supportata in questo browser headless',
  );

  await waitForBrowserPushGranted(page);

  const session = await loginSupabase(user.email, user.password);
  const row = await waitForPushSubscriptionInDb({
    accessToken: session.accessToken,
    userId: session.userId,
  });

  expect(row.endpoint.length).toBeGreaterThan(10);
  expect(row.device_id).toBeTruthy();

  const stateAfter = await readBrowserPushState(page);
  expect(stateAfter.permission).toBe('granted');
  expect(stateAfter.hasSubscription).toBe(true);

  expect(errors, `errori JS: ${errors.join('; ')}`).toEqual([]);
});
