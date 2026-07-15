// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:alfred_client/utils/push_permission_flow.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('isWebPushEnvironmentSupported', () {
    test('false when serviceWorker checked on window only', () {
      expect(
        isWebPushEnvironmentSupported(
          hasPushManagerOnWindow: true,
          hasServiceWorkerOnNavigator: false,
        ),
        isFalse,
      );
    });

    test('true when PushManager on window and serviceWorker on navigator', () {
      expect(
        isWebPushEnvironmentSupported(
          hasPushManagerOnWindow: true,
          hasServiceWorkerOnNavigator: true,
        ),
        isTrue,
      );
    });
  });

  group('shouldAttemptPushSubscription', () {
    test('false when push not supported', () {
      expect(
        shouldAttemptPushSubscription(
          isPushSupported: false,
          notificationPermission: 'default',
        ),
        isFalse,
      );
    });

    test('false when permission denied', () {
      expect(
        shouldAttemptPushSubscription(
          isPushSupported: true,
          notificationPermission: 'denied',
        ),
        isFalse,
      );
    });

    test('true when supported and default', () {
      expect(
        shouldAttemptPushSubscription(
          isPushSupported: true,
          notificationPermission: 'default',
        ),
        isTrue,
      );
    });

    test('true when supported and granted', () {
      expect(
        shouldAttemptPushSubscription(
          isPushSupported: true,
          notificationPermission: 'granted',
        ),
        isTrue,
      );
    });
  });

  group('shouldPersistPushSubscription', () {
    test('only granted persists', () {
      expect(
        shouldPersistPushSubscription(notificationPermission: 'granted'),
        isTrue,
      );
      expect(
        shouldPersistPushSubscription(notificationPermission: 'default'),
        isFalse,
      );
      expect(
        shouldPersistPushSubscription(notificationPermission: 'denied'),
        isFalse,
      );
      expect(shouldPersistPushSubscription(notificationPermission: null), isFalse);
    });
  });
}
