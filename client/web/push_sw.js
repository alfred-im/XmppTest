// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

/* Alfred Web Push service worker — VAPID notifications */

const SUPPRESSION_KEY = 'alfred_push_suppression';

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
  const state = readSuppression();
  if (!state || !state.appVisible) return false;
  if (!data || !data.recipientUserId || !data.peerProfileId) return false;
  return (
    state.focusUserId === data.recipientUserId &&
    state.activePeerProfileId === data.peerProfileId
  );
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

  const title = payload.peerDisplayName || 'Alfred';
  const body = payload.previewText || 'Nuovo messaggio';
  const tag = payload.logicalMessageId || undefined;

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
            recipientUserId: data.recipientUserId,
            peerProfileId: data.peerProfileId,
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
