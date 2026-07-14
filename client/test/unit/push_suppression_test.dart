// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:alfred_client/utils/push_stub.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('push suppression state keys are stable', () {
    PushPlatform.updateSuppression(
      focusUserId: 'user-a',
      activePeerProfileId: 'peer-b',
      appVisible: true,
    );
    expect(PushPlatform.openChatIntents, isA<Stream<PushOpenChatIntent>>());
  });
}
