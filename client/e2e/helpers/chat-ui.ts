// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { Page } from '@playwright/test';

import { enableFlutterAccessibility } from './flutter-a11y';

const CHAT_UI_NOISE = new Set([
  'Indietro',
  'Scrivi un messaggio',
  'Nuovo messaggio',
  'Continua',
  'Indirizzo',
  'Aggiungi account',
  'Altri account',
  'Cerca',
]);

/**
 * Raccoglie testi visibili dal canvas Flutter (euristica per diagnosi duplicati/stale).
 * Non è un contratto di prodotto — solo dump diagnostico e2e.
 */
export async function collectVisibleChatTexts(page: Page): Promise<string[]> {
  await enableFlutterAccessibility(page);
  return page.evaluate((noise) => {
    const out: string[] = [];
    const nodes = document.querySelectorAll('flt-semantics');
    nodes.forEach((node) => {
      const raw = node.textContent?.replace(/\s+/g, ' ').trim();
      if (!raw || raw.length < 2) return;
      if (noise.includes(raw)) return;
      out.push(raw);
    });
    return out;
  }, [...CHAT_UI_NOISE]);
}

export function findDuplicateBodies(bodies: string[]): string[] {
  const counts = new Map<string, number>();
  for (const b of bodies) {
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([body, n]) => `${body} (×${n})`);
}

export function compareUiBodiesToDb(options: {
  uiBodies: string[];
  dbBodies: string[];
  focusBody: string;
}): {
  missingInUi: string[];
  extraInUi: string[];
  focusVisible: boolean;
  dbDuplicates: string[];
} {
  const uiJoined = options.uiBodies.join('\n');
  const uiHasBody = (body: string) =>
    options.uiBodies.some((t) => t.includes(body)) || uiJoined.includes(body);
  const dbSet = new Set(options.dbBodies);
  const dbCounts = new Map<string, number>();
  for (const b of options.dbBodies) {
    dbCounts.set(b, (dbCounts.get(b) ?? 0) + 1);
  }
  return {
    missingInUi: options.dbBodies.filter((b) => !uiHasBody(b)),
    extraInUi: options.uiBodies.filter(
      (t) => !options.dbBodies.some((b) => t.includes(b)),
    ),
    focusVisible: uiHasBody(options.focusBody),
    dbDuplicates: [...dbCounts.entries()]
      .filter(([, n]) => n > 1)
      .map(([b, n]) => `${b} (×${n} in DB)`),
  };
}

/** Conta nodi semantics il cui testo contiene `body` (duplicati UI per messaggio). */
export function countUiNodesContainingBody(
  uiBodies: string[],
  body: string,
): number {
  return uiBodies.filter((t) => t.includes(body)).length;
}
