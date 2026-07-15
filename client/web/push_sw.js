// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

/* Alfred Web Push service worker — VAPID notifications */

const SUPPRESSION_KEY = 'alfred_push_suppression';
const PENDING_OPEN_CHAT_KEY = 'alfred_pending_open_chat';
const PUSH_KEY_SEPARATOR = '|';

/** Chiave univoca push: account destinatario + peer (mai solo peer). */
function pushConversationKey(ownerUserId, peerProfileId) {
  return ownerUserId + PUSH_KEY_SEPARATOR + peerProfileId;
}

function persistPendingOpenChat(conversation) {
  try {
    localStorage.setItem(
      PENDING_OPEN_CHAT_KEY,
      JSON.stringify({
        recipientUserId: conversation.ownerUserId,
        peerProfileId: conversation.peerProfileId,
      }),
    );
  } catch (_) {
    // localStorage può essere bloccato in alcuni contesti SW.
  }
}

function tryParsePushConversation(payload) {
  if (!payload || !payload.recipientUserId || !payload.peerProfileId) {
    return null;
  }
  if (payload.recipientUserId === payload.peerProfileId) return null;
  return {
    ownerUserId: payload.recipientUserId,
    peerProfileId: payload.peerProfileId,
    canonicalKey: pushConversationKey(
      payload.recipientUserId,
      payload.peerProfileId,
    ),
  };
}

function pushNotificationTag(payload) {
  const conversation = tryParsePushConversation(payload);
  if (!conversation) return undefined;
  if (payload.logicalMessageId) {
    return (
      conversation.canonicalKey +
      PUSH_KEY_SEPARATOR +
      payload.logicalMessageId
    );
  }
  return conversation.canonicalKey;
}

function readSuppression() {
  try {
    const raw = localStorage.getItem(SUPPRESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function shouldSuppress(data) {
  const conversation = tryParsePushConversation(data);
  if (!conversation) return false;
  const state = readSuppression();
  if (!state || !state.appVisible) return false;
  return (
    state.focusUserId === conversation.ownerUserId &&
    state.activePeerProfileId === conversation.peerProfileId
  );
}

/** Multi-account: indica su quale account Alfred è arrivato il messaggio. */
function formatNotificationTitle(payload) {
  const peer = payload.peerDisplayName || 'Alfred';
  const account =
    payload.recipientUsername || payload.recipientDisplayName || null;
  if (account) {
    return account + ' · da ' + peer;
  }
  return peer;
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (_) {
    return;
  }

  if (shouldSuppress(payload)) {
    return;
  }

  const conversation = tryParsePushConversation(payload);
  if (!conversation) return;

  const title = formatNotificationTitle(payload);
  const body = payload.previewText || 'Nuovo messaggio';
  const tag = pushNotificationTag(payload);

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body,
        tag,
        icon: 'icons/Icon-192.png',
        badge: 'icons/Icon-192.png',
        data: payload,
      });

      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const notice = JSON.stringify({
        type: 'alfred_push_received',
        payload,
      });
      for (const client of windowClients) {
        client.postMessage(notice);
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const conversation = tryParsePushConversation(data);
  if (!conversation) return;

  persistPendingOpenChat(conversation);

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clients) {
        client.postMessage(
          JSON.stringify({
            type: 'open_chat',
            recipientUserId: conversation.ownerUserId,
            peerProfileId: conversation.peerProfileId,
          }),
        );
        if ('focus' in client) {
          await client.focus();
        }
        return;
      }

      await self.clients.openWindow('./');
    })(),
  );
});
