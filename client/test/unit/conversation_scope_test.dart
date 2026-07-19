// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:alfred_client/models/chat_peer.dart';
import 'package:alfred_client/models/conversation_scope.dart';
import 'package:alfred_client/models/profile_summary.dart';
import 'package:alfred_client/services/account_manager.dart';
import 'package:alfred_client/services/account_session.dart';

import '../support/fake_messaging_services.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ConversationScope registry', () {
    late AccountManager manager;
    late AccountSession sessionA;
    late AccountSession sessionB;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      manager = AccountManager();
      sessionA = await AccountSession.createForTest(
        profile: const ProfileSummary(
          id: 'account-a',
          username: 'alice',
          displayName: 'Alice',
        ),
        client: createTestSupabaseClient(),
      );
      sessionB = await AccountSession.createForTest(
        profile: const ProfileSummary(
          id: 'account-b',
          username: 'bob',
          displayName: 'Bob',
        ),
        client: createTestSupabaseClient(),
      );
      manager.seedTestAccount('account-a');
      manager.seedTestAccount('account-b');
      manager.injectTestSession(sessionA);
      manager.injectTestSession(sessionB);
      manager.focusTestSession(sessionA);
    });

    test('commit + isScopeCommitted con sessione viva', () {
      const peer = ProfileSummary(
        id: 'peer-z',
        username: 'peer_z',
        displayName: 'Peer Z',
      );
      final scope = ConversationScope.fromSession(
        sessionA,
        ChatPeer(profile: peer),
      );

      manager.commitScope(scope);
      expect(manager.isScopeCommitted(scope), isTrue);
    });

    test('focus switch invalida scope precedente', () async {
      const peer = ProfileSummary(
        id: 'peer-z',
        username: 'peer_z',
        displayName: 'Peer Z',
      );
      manager.commitScope(
        ConversationScope.fromSession(sessionA, ChatPeer(profile: peer)),
      );

      manager.injectTestSession(sessionB);
      await manager.setFocus('account-b');

      expect(manager.committedScope, isNull);
    });

    test('syncCommittedScopeFromViewState riallinea dopo restore', () {
      const peer = ProfileSummary(
        id: 'peer-z',
        username: 'peer_z',
        displayName: 'Peer Z',
      );
      manager.applyAccountViewState(
        'account-a',
        (view) => view.openChat(ChatPeer(profile: peer)),
      );
      manager.syncCommittedScopeFromViewState();

      expect(manager.committedScope?.peerProfileId, 'peer-z');
      expect(manager.committedScope?.sessionEpoch, sessionA.epoch);
    });

    test('epoch distingue sessioni restore', () async {
      final sessionA2 = await AccountSession.createForTest(
        profile: const ProfileSummary(
          id: 'account-a',
          username: 'alice',
          displayName: 'Alice',
        ),
        client: createTestSupabaseClient(),
      );
      expect(sessionA.epoch, isNot(sessionA2.epoch));
    });
  });
}
