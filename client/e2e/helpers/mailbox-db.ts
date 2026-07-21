// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { E2E_TIMEOUT } from './timeouts';

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? 'https://tvwpoxxcqwphryvuyqzu.supabase.co';

const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2d3BveHhjcXdwaHJ5dnV5cXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNTkzODAsImV4cCI6MjA5NzczNTM4MH0.u85Ze5hAtZp6P-3-LSrb0QM2nSG1cfM1I6hddCov0_M';

export type MailboxMessage = {
  id: string;
  owner_id: string;
  author_id: string;
  peer_profile_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
  logical_message_id: string;
  delivered_at: string | null;
};

export type InboxRow = {
  peer_profile_id: string;
  display_name: string;
  unread_count: number;
  last_message_preview: string;
  last_message_at: string;
};

export type MailboxSnapshot = {
  at: string;
  viewerUserId: string;
  peerProfileId: string;
  inboxRow: InboxRow | null;
  messages: MailboxMessage[];
  unreadIncoming: MailboxMessage[];
};

export async function listMailboxMessages(
  accessToken: string,
  peerProfileId: string,
  limit = 100,
): Promise<MailboxMessage[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/list_peer_messages`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_peer_profile_id: peerProfileId,
      p_limit: limit,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `list_peer_messages fallito (${res.status}): ${await res.text()}`,
    );
  }
  return (await res.json()) as MailboxMessage[];
}

export async function listInbox(accessToken: string): Promise<InboxRow[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/list_inbox`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(`list_inbox fallito (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as InboxRow[];
}

export async function sendMessageToProfile(options: {
  accessToken: string;
  recipientProfileId: string;
  body: string;
  clientMessageId: string;
}): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/send_message_to_profile`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_recipient_profile_id: options.recipientProfileId,
      p_body: options.body,
      p_client_message_id: options.clientMessageId,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `send_message_to_profile fallito (${res.status}): ${await res.text()}`,
    );
  }
}

export async function markPeerReadAudit(
  accessToken: string,
  peerProfileId: string,
): Promise<{ status: number; body: string }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_peer_read`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ p_peer_profile_id: peerProfileId }),
  });
  return { status: res.status, body: await res.text() };
}

/** Snapshot mailbox destinatario verso un peer (inbox + messaggi + non letti in ingresso). */
export async function snapshotRecipientMailbox(options: {
  accessToken: string;
  viewerUserId: string;
  peerProfileId: string;
}): Promise<MailboxSnapshot> {
  const [inbox, messages] = await Promise.all([
    listInbox(options.accessToken),
    listMailboxMessages(options.accessToken, options.peerProfileId),
  ]);
  const inboxRow =
    inbox.find((r) => r.peer_profile_id === options.peerProfileId) ?? null;
  const unreadIncoming = messages.filter(
    (m) =>
      m.owner_id === options.viewerUserId &&
      m.author_id !== options.viewerUserId &&
      m.read_at == null,
  );
  return {
    at: new Date().toISOString(),
    viewerUserId: options.viewerUserId,
    peerProfileId: options.peerProfileId,
    inboxRow,
    messages,
    unreadIncoming,
  };
}

export async function waitForMessageInMailbox(options: {
  accessToken: string;
  peerProfileId: string;
  body: string;
  timeoutMs?: number;
}): Promise<MailboxMessage> {
  const deadline = Date.now() + (options.timeoutMs ?? E2E_TIMEOUT.db);
  let lastBodies: string[] = [];
  while (Date.now() < deadline) {
    const messages = await listMailboxMessages(
      options.accessToken,
      options.peerProfileId,
    );
    lastBodies = messages.map((m) => m.body);
    const match = messages.find((m) => m.body === options.body);
    if (match) return match;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `messaggio "${options.body}" assente su DB (peer=${options.peerProfileId}). Ultimi: ${JSON.stringify(lastBodies.slice(-10))}`,
  );
}

export async function waitForReadAt(options: {
  accessToken: string;
  peerProfileId: string;
  body: string;
  timeoutMs?: number;
}): Promise<MailboxMessage | null> {
  const deadline = Date.now() + (options.timeoutMs ?? 15_000);
  while (Date.now() < deadline) {
    const messages = await listMailboxMessages(
      options.accessToken,
      options.peerProfileId,
    );
    const match = messages.find((m) => m.body === options.body);
    if (match?.read_at) return match;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

export function formatMailboxSnapshot(label: string, snap: MailboxSnapshot): string {
  return [
    `=== ${label} ===`,
    `at: ${snap.at}`,
    `viewer: ${snap.viewerUserId}`,
    `peer: ${snap.peerProfileId}`,
    `inbox unread_count: ${snap.inboxRow?.unread_count ?? 'n/a'}`,
    `inbox preview: ${snap.inboxRow?.last_message_preview ?? 'n/a'}`,
    `unread incoming (${snap.unreadIncoming.length}):`,
    ...snap.unreadIncoming.map(
      (m) =>
        `  - "${m.body}" id=${m.id.slice(0, 8)}… read_at=${m.read_at} author=${m.author_id.slice(0, 8)}…`,
    ),
    `all messages (${snap.messages.length}):`,
    ...snap.messages.map(
      (m) =>
        `  - "${m.body}" in=${m.author_id === m.owner_id ? 'out' : 'in'} read_at=${m.read_at ?? 'null'} created=${m.created_at}`,
    ),
  ].join('\n');
}
