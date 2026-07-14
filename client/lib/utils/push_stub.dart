// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'dart:async';

/// Web Push platform hooks — stub (non-web / test).
class PushPlatform {
  const PushPlatform._();

  static Future<String> getOrCreateDeviceId() async => '00000000-0000-4000-8000-000000000000';

  static Future<String?> requestPermissionIfNeeded() async => null;

  static Future<PushSubscriptionKeys?> ensureSubscription({
    required String vapidPublicKey,
  }) async =>
      null;

  static void updateSuppression({
    required String? focusUserId,
    required String? activePeerProfileId,
    required bool appVisible,
  }) {}

  static Stream<PushOpenChatIntent> get openChatIntents =>
      const Stream<PushOpenChatIntent>.empty();

  static void ensureMessageHook() {}

  static Future<void> unregisterServiceWorkerSubscription() async {}
}

class PushSubscriptionKeys {
  const PushSubscriptionKeys({
    required this.endpoint,
    required this.p256dhKey,
    required this.authKey,
  });

  final String endpoint;
  final String p256dhKey;
  final String authKey;
}

class PushOpenChatIntent {
  const PushOpenChatIntent({
    required this.recipientUserId,
    required this.peerProfileId,
  });

  final String recipientUserId;
  final String peerProfileId;
}
