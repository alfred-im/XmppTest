// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { expect, type Page } from '@playwright/test';

import { E2E_POLL, E2E_TIMEOUT } from './timeouts';

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  device_id: string;
  endpoint: string;
};

export async function listPushSubscriptions(
  accessToken: string,
  userId: string,
): Promise<PushSubscriptionRow[]> {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? 'https://tvwpoxxcqwphryvuyqzu.supabase.co';
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2d3BveHhjcXdwaHJ5dnV5cXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNTkzODAsImV4cCI6MjA5NzczNTM4MH0.u85Ze5hAtZp6P-3-LSrb0QM2nSG1cfM1I6hddCov0_M';

  const res = await fetch(
    `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${userId}&select=id,user_id,device_id,endpoint`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (!res.ok) {
    throw new Error(
      `push_subscriptions query failed (${res.status}): ${await res.text()}`,
    );
  }
  return (await res.json()) as PushSubscriptionRow[];
}

export async function waitForPushSubscriptionInDb(options: {
  accessToken: string;
  userId: string;
  timeoutMs?: number;
}): Promise<PushSubscriptionRow> {
  const deadline = Date.now() + (options.timeoutMs ?? E2E_TIMEOUT.db);
  while (Date.now() < deadline) {
    const rows = await listPushSubscriptions(options.accessToken, options.userId);
    if (rows.length > 0) return rows[0]!;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`nessuna push_subscriptions per user ${options.userId}`);
}

export async function readBrowserPushState(page: Page) {
  return page.evaluate(async () => {
    const supported =
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
    const permission = supported
      ? Notification.permission
      : 'unsupported';
    let hasSubscription = false;
    if (supported && Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        hasSubscription = (await reg.pushManager.getSubscription()) != null;
      } catch {
        hasSubscription = false;
      }
    }
    const deviceId = localStorage.getItem('alfred_device_id');
    return { supported, permission, hasSubscription, deviceId };
  });
}

export async function waitForBrowserPushGranted(page: Page) {
  await expect
    .poll(
      async () => {
        const state = await readBrowserPushState(page);
        return state.permission === 'granted' && state.hasSubscription;
      },
      { timeout: E2E_TIMEOUT.auth, intervals: [...E2E_POLL] },
    )
    .toBe(true);
}
