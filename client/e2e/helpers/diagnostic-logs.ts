// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { Page, TestInfo } from '@playwright/test';

/**
 * Raccoglie righe `[alfred]` dalla console browser (richiede build con
 * `ALFRED_DIAGNOSTIC_LOG=true`, es. `scripts/run-push-e2e-local.sh`).
 */
export function attachDiagnosticLogCollector(page: Page): string[] {
  const logs: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[alfred]')) logs.push(text);
  });
  return logs;
}

/** Testo da appendere ai messaggi `expect` quando il test fallisce. */
export function formatDiagnosticLogsFooter(logs: string[]): string {
  if (logs.length === 0) {
    return '(nessun log [alfred] — build senza ALFRED_DIAGNOSTIC_LOG?)';
  }
  return `log diagnostici:\n${logs.join('\n')}`;
}

/** Fasi push attese (filtra rumore pending.drain). */
export function summarizePushDiagPhases(logs: string[]): string[] {
  const interesting = [
    'sw.message',
    'open_chat.emit',
    'handler.enqueue',
    'focus.ok',
    'handler.chat_opened',
    'FAIL',
    'pending.clear',
  ];
  return logs.filter((line) =>
    interesting.some((token) => line.includes(token)),
  );
}

/** Stampa il dump in stdout se il test non è passato. */
export function dumpDiagnosticLogsOnFailure(
  logs: string[],
  testInfo: TestInfo,
): void {
  if (testInfo.status === 'passed' || logs.length === 0) return;
  console.log(
    `=== ALFRED DIAGNOSTIC LOGS (${testInfo.title}) ===\n${logs.join('\n')}`,
  );
}
