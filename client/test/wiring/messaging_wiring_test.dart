// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:alfred_client/providers/messages_controller.dart';
import 'package:alfred_client/services/message_media_service.dart';

import '../support/fake_messaging_services.dart';

const _userId = 'user-a';
const _peerId = 'peer-b';

/// Wiring: MessagesController → MessagingCoordinator → MessagesControllerEffects
/// (effects live). Fake solo su MessageService (confine RPC).
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('messaging wiring', () {
    late FakeMessageService messageService;
    late FakeInboxService inboxService;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      final client = createTestSupabaseClient();
      messageService = FakeMessageService(client);
      inboxService = FakeInboxService();
    });

    test('sendText attraversa coordinator ed effects live', () async {
      final controller = MessagesController(
        userId: _userId,
        peerProfileId: _peerId,
        messageService: messageService,
        messageMediaService: MessageMediaService(createTestSupabaseClient()),
        inboxService: inboxService,
        hasValidSession: () => true,
      );
      await waitForMessagesController(controller);

      expect(controller.isSending, isFalse);

      await controller.send('ciao wiring');

      expect(controller.isSending, isFalse);
      expect(controller.messages.length, greaterThanOrEqualTo(1));
      expect(controller.messages.last.body, 'ciao wiring');
      expect(messageService.sentBodies, contains('ciao wiring'));
    });

    test('queue key nel controller combina userId e peerProfileId', () {
      final key = MessagesController.outboundQueueKey(
        userId: _userId,
        peerProfileId: _peerId,
      );
      expect(key, '$_userId|$_peerId');
    });
  });
}
