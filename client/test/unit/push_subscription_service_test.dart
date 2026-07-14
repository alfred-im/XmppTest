// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:alfred_client/services/push_subscription_service.dart';
import 'package:alfred_client/utils/push_stub.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('syncOpenAccounts is no-op off-web', () async {
    final service = PushSubscriptionService();
    await service.syncOpenAccounts(const []);
    await service.unregisterAccount(
      userId: 'x',
      account: null,
      isLastAccountOnDevice: true,
    );
    expect(await PushPlatform.getOrCreateDeviceId(), isNotEmpty);
  });
}
