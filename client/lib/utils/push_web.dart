// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'dart:async';
import 'dart:convert';
import 'dart:js_interop';
import 'dart:typed_data';

import 'package:uuid/uuid.dart';
import 'package:web/web.dart' as web;

import 'push_stub.dart' show PushOpenChatIntent, PushSubscriptionKeys;

export 'push_stub.dart' show PushOpenChatIntent, PushSubscriptionKeys;

const _deviceIdKey = 'alfred_device_id';
const _suppressionKey = 'alfred_push_suppression';

final _openChatController = StreamController<PushOpenChatIntent>.broadcast();

/// Web Push platform hooks (VAPID + service worker).
class PushPlatform {
  const PushPlatform._();

  static Future<String> getOrCreateDeviceId() async {
    final storage = web.window.localStorage;
    final existing = storage.getItem(_deviceIdKey);
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }
    final id = const Uuid().v4();
    storage.setItem(_deviceIdKey, id);
    return id;
  }

  static Future<String?> requestPermissionIfNeeded() async {
    try {
      if (web.Notification.permission == 'granted') {
        return 'granted';
      }
      if (web.Notification.permission == 'denied') {
        return 'denied';
      }
      final result = (await web.Notification.requestPermission().toDart).toDart;
      if (result == 'granted') return 'granted';
      if (result == 'denied') return 'denied';
      return 'default';
    } catch (_) {
      return 'denied';
    }
  }

  static Future<PushSubscriptionKeys?> ensureSubscription({
    required String vapidPublicKey,
  }) async {
    if (web.Notification.permission != 'granted') return null;
    if (vapidPublicKey.isEmpty) return null;

    final base = web.document.querySelector('base')?.getAttribute('href') ?? '/';
    final swUrl = '${base}push_sw.js';
    final registration = await web.window.navigator.serviceWorker
        .register(swUrl.toJS)
        .toDart;

    final existing = await registration.pushManager.getSubscription().toDart;
    web.PushSubscription subscription;
    if (existing != null) {
      subscription = existing;
    } else {
      subscription = await registration.pushManager
          .subscribe(
            web.PushSubscriptionOptionsInit(
              userVisibleOnly: true,
              applicationServerKey: _urlBase64ToUint8Array(vapidPublicKey),
            ),
          )
          .toDart;
    }

    final endpoint = subscription.endpoint;
    final key = subscription.getKey('p256dh');
    final auth = subscription.getKey('auth');
    if (key == null || auth == null) return null;

    return PushSubscriptionKeys(
      endpoint: endpoint,
      p256dhKey: _bufferToBase64Url(key),
      authKey: _bufferToBase64Url(auth),
    );
  }

  static void updateSuppression({
    required String? focusUserId,
    required String? activePeerProfileId,
    required bool appVisible,
  }) {
    final payload = jsonEncode({
      'focusUserId': focusUserId,
      'activePeerProfileId': activePeerProfileId,
      'appVisible': appVisible,
    });
    web.window.localStorage.setItem(_suppressionKey, payload);
  }

  static Stream<PushOpenChatIntent> get openChatIntents =>
      _openChatController.stream;

  static void _handleWindowMessage(web.Event event) {
    if (!event.isA<web.MessageEvent>()) return;
    final messageEvent = event as web.MessageEvent;
    final data = messageEvent.data;
    if (data == null) return;

    final String? raw;
    if (data.isA<JSString>()) {
      raw = (data as JSString).toDart;
    } else {
      return;
    }

    Map<String, dynamic> map;
    try {
      map = jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return;
    }

    if (map['type'] != 'open_chat') return;
    final recipient = map['recipientUserId'] as String?;
    final peer = map['peerProfileId'] as String?;
    if (recipient == null || peer == null) return;
    _openChatController.add(
      PushOpenChatIntent(recipientUserId: recipient, peerProfileId: peer),
    );
  }

  static var _messageHookInstalled = false;

  static void ensureMessageHook() {
    if (_messageHookInstalled) return;
    _messageHookInstalled = true;
    web.window.addEventListener('message', _handleWindowMessage.toJS);
  }

  static Future<void> unregisterServiceWorkerSubscription() async {
    final registration = await web.window.navigator.serviceWorker.ready.toDart;
    final sub = await registration.pushManager.getSubscription().toDart;
    await sub?.unsubscribe().toDart;
  }
}

JSUint8Array _urlBase64ToUint8Array(String base64String) {
  final padding = '=' * ((4 - base64String.length % 4) % 4);
  final base64 = (base64String + padding)
      .replaceAll('-', '+')
      .replaceAll('_', '/');
  final raw = base64Decode(base64);
  final bytes = Uint8List.fromList(raw);
  return bytes.toJS;
}

String _bufferToBase64Url(JSArrayBuffer buffer) {
  final bytes = Uint8List.view(buffer.toDart);
  return base64Url.encode(bytes).replaceAll('=', '');
}
