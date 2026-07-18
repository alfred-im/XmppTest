// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:alfred_client/machines/navigation/navigation_adapters.dart';
import 'package:alfred_client/machines/navigation/navigation_effects.dart';
import 'package:alfred_client/machines/navigation/navigation_machine.dart';
import 'package:alfred_client/models/chat_peer.dart';
import 'package:alfred_client/models/profile_summary.dart';
import 'package:flutter_test/flutter_test.dart';

class _RecordingNavigationEffects implements NavigationEffects {
  String? lastFocusAccountId;
  ChatPeer? lastPeer;
  String? lastOpenAccountId;
  String? lastOpenPeerId;
  bool? lastAllowFallback;
  bool openResult = true;
  bool pushOpenResult = true;
  bool focusedIsGroup = false;
  int closeCount = 0;
  int openGroupChatCount = 0;
  int backToGroupHomeCount = 0;

  @override
  bool get focusedAccountIsGroup => focusedIsGroup;

  @override
  Future<void> focusAccount(String accountUserId) async {
    lastFocusAccountId = accountUserId;
  }

  @override
  Future<bool> openConversationOnAccount({
    required String accountUserId,
    required String peerProfileId,
    required bool allowProfileFallback,
    int inboxRetryAttempts = 10,
    bool skipStaleClear = false,
  }) async {
    lastOpenAccountId = accountUserId;
    lastOpenPeerId = peerProfileId;
    lastAllowFallback = allowProfileFallback;
    return openResult;
  }

  @override
  Future<bool> openConversationFromPushTap({
    required String accountUserId,
    required String peerProfileId,
  }) async {
    lastOpenAccountId = accountUserId;
    lastOpenPeerId = peerProfileId;
    return pushOpenResult;
  }

  @override
  void openPeerOnFocusedAccount(ChatPeer peer) {
    lastPeer = peer;
  }

  @override
  void closeConversation() {
    closeCount++;
  }

  @override
  void openGroupChat() {
    openGroupChatCount++;
  }

  @override
  void backToGroupHome() {
    backToGroupHomeCount++;
  }
}

ChatPeer _peer(String id) => ChatPeer(
      profile: ProfileSummary(
        id: id,
        username: id,
        displayName: id,
      ),
    );

void main() {
  group('NavigationMachine shell state', () {
    test('SwitchToAccount su utente → inboxVisible', () async {
      final effects = _RecordingNavigationEffects();
      final machine = NavigationMachine(effects);

      await machine.send(const SwitchToAccount('user-a'));

      expect(machine.shellState, NavigationShellState.inboxVisible);
      expect(effects.lastFocusAccountId, 'user-a');
    });

    test('SwitchToAccount su gruppo → groupShell', () async {
      final effects = _RecordingNavigationEffects()..focusedIsGroup = true;
      final machine = NavigationMachine(effects);

      await machine.send(const SwitchToAccount('group-a'));

      expect(machine.shellState, NavigationShellState.groupShell);
    });

    test('OpenPeerOnFocusedAccount → chatOpen', () async {
      final effects = _RecordingNavigationEffects();
      final machine = NavigationMachine(effects);

      await machine.send(OpenPeerOnFocusedAccount(_peer('peer-b')));

      expect(machine.shellState, NavigationShellState.chatOpen);
      expect(effects.lastPeer?.profileId, 'peer-b');
    });

    test('OpenConversationOnAccount ok → chatOpen', () async {
      final effects = _RecordingNavigationEffects();
      final machine = NavigationMachine(effects);

      await machine.send(
        const OpenConversationOnAccount(
          accountUserId: 'user-a',
          peerProfileId: 'peer-b',
        ),
      );

      expect(machine.shellState, NavigationShellState.chatOpen);
      expect(effects.lastAllowFallback, isTrue);
    });

    test('OpenConversationOnAccount rejected → inboxVisible', () async {
      final effects = _RecordingNavigationEffects()..openResult = false;
      final machine = NavigationMachine(effects);

      await machine.send(
        const OpenConversationOnAccount(
          accountUserId: 'user-a',
          peerProfileId: 'peer-b',
        ),
      );

      expect(machine.shellState, NavigationShellState.inboxVisible);
    });

    test('OpenFromShareableLink usa fallback profilo', () async {
      final effects = _RecordingNavigationEffects();
      final machine = NavigationMachine(effects);

      await machine.send(
        const OpenFromShareableLink(
          accountUserId: 'user-a',
          peerProfileId: 'peer-b',
        ),
      );

      expect(machine.shellState, NavigationShellState.chatOpen);
      expect(effects.lastAllowFallback, isTrue);
    });

    test('CloseConversation → inboxVisible', () async {
      final effects = _RecordingNavigationEffects();
      final machine = NavigationMachine(effects)
        ..shellState = NavigationShellState.chatOpen;

      await machine.send(const CloseConversation());

      expect(machine.shellState, NavigationShellState.inboxVisible);
      expect(effects.closeCount, 1);
    });

    test('CloseConversation su gruppo → groupShell', () async {
      final effects = _RecordingNavigationEffects()..focusedIsGroup = true;
      final machine = NavigationMachine(effects)
        ..shellState = NavigationShellState.groupShell;

      await machine.send(const CloseConversation());

      expect(machine.shellState, NavigationShellState.groupShell);
      expect(effects.closeCount, 1);
    });

    test('OpenGroupChat e BackToGroupHome restano in groupShell', () async {
      final effects = _RecordingNavigationEffects()..focusedIsGroup = true;
      final machine = NavigationMachine(effects);
      final adapters = NavigationAdapters(machine);

      await adapters.openGroupChat();
      expect(machine.shellState, NavigationShellState.groupShell);
      expect(effects.openGroupChatCount, 1);

      await adapters.backToGroupHome();
      expect(machine.shellState, NavigationShellState.groupShell);
      expect(effects.backToGroupHomeCount, 1);
    });
  });
}
