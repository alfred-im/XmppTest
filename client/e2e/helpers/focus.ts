// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { expect, type Page } from '@playwright/test';

import { E2E_POLL, E2E_TIMEOUT } from './timeouts';

/** Legge `flutter.alfred_focus_user_id` (JSON doppio annidato da shared_preferences web). */
export async function readFocusedUserId(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('flutter.alfred_focus_user_id');
    if (!raw) return null;
    let value: unknown = raw;
    while (typeof value === 'string' && value.startsWith('"')) {
      value = JSON.parse(value);
    }
    return typeof value === 'string' ? value : null;
  });
}

export async function expectFocusedUserId(page: Page, userId: string) {
  await expect
    .poll(
      async () => (await readFocusedUserId(page)) === userId,
      { timeout: E2E_TIMEOUT.ui, intervals: [...E2E_POLL] },
    )
    .toBe(true);
}

/** Attende che il focus coincida con `userId` (senza assert). */
export async function waitForFocusedUserId(
  page: Page,
  userId: string,
  timeoutMs = E2E_TIMEOUT.ui,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await readFocusedUserId(page)) === userId) return true;
    await page.waitForTimeout(200);
  }
  return false;
}
