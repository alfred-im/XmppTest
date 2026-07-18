// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:alfred_client/machines/multi-account/multi_account_adapters.dart';
import 'package:alfred_client/machines/multi-account/multi_account_effects.dart';
import 'package:alfred_client/machines/multi-account/multi_account_machine.dart';
import 'package:alfred_client/models/profile_summary.dart';
import 'package:flutter_test/flutter_test.dart';

class _RecordingEffects implements MultiAccountEffects {
  @override
  bool hasOpenAccounts = false;
  @override
  bool hasFocusedSession = false;
  String? lastFocusUserId;
  int focusCalls = 0;
  int reconnectCalls = 0;
  int closeCalls = 0;
  bool focusShouldThrow = false;

  @override
  Future<void> focusAccount(String accountUserId) async {
    focusCalls++;
    lastFocusUserId = accountUserId;
    if (focusShouldThrow) {
      throw StateError('focus failed');
    }
  }

  @override
  Future<void> reconnectFocusedSession() async {
    reconnectCalls++;
  }

  @override
  Future<void> openAccountWithPassword({
    required String email,
    required String password,
  }) async {
    hasOpenAccounts = true;
    hasFocusedSession = true;
  }

  @override
  Future<void> openAccountWithSignUp({
    required String email,
    required String password,
    required String username,
    required String displayName,
    ProfileKind profileKind = ProfileKind.user,
  }) async {
    hasOpenAccounts = true;
    hasFocusedSession = true;
  }

  @override
  Future<void> closeAccount(String accountUserId) async {
    closeCalls++;
    hasOpenAccounts = false;
    hasFocusedSession = false;
  }
}

void main() {
  group('MultiAccountMachine InitializeManifest', () {
    test('manifest empty → NoOpenAccounts', () {
      final machine = MultiAccountMachine();
      machine.send(
        const ManifestInitialized(
          hasOpenAccounts: false,
          hasFocusedSession: false,
        ),
      );
      expect(machine.focusState, MultiAccountFocusState.noOpenAccounts);
    });

    test('manifest + session → FocusedWithSession', () {
      final machine = MultiAccountMachine();
      machine.send(
        const ManifestInitialized(
          hasOpenAccounts: true,
          hasFocusedSession: true,
        ),
      );
      expect(machine.focusState, MultiAccountFocusState.focusedWithSession);
    });

    test('manifest without session → FocusedAwaitingSession', () {
      final machine = MultiAccountMachine();
      machine.send(
        const ManifestInitialized(
          hasOpenAccounts: true,
          hasFocusedSession: false,
        ),
      );
      expect(machine.focusState, MultiAccountFocusState.focusedAwaitingSession);
    });
  });

  group('MultiAccountMachine AccountOpened', () {
    test('from NoOpenAccounts with session → FocusedWithSession', () {
      final machine = MultiAccountMachine();
      machine.send(const AccountOpened(sessionReady: true));
      expect(machine.focusState, MultiAccountFocusState.focusedWithSession);
    });

    test('from NoOpenAccounts without session → HasOpenAccounts', () {
      final machine = MultiAccountMachine();
      machine.send(const AccountOpened(sessionReady: false));
      expect(machine.focusState, MultiAccountFocusState.hasOpenAccounts);
    });
  });

  group('MultiAccountMachine FocusAccount', () {
    test('from FocusedWithSession → FocusSwitching → FocusedWithSession', () async {
      final effects = _RecordingEffects()..hasFocusedSession = true;
      final machine = MultiAccountMachine(effects: effects)
        ..send(
          const ManifestInitialized(
            hasOpenAccounts: true,
            hasFocusedSession: true,
          ),
        );

      final future = machine.send(const FocusAccount('user-b'));
      expect(machine.focusState, MultiAccountFocusState.focusSwitching);
      await future;

      expect(machine.focusState, MultiAccountFocusState.focusedWithSession);
      expect(effects.lastFocusUserId, 'user-b');
    });

    test('restore failed → FocusedAwaitingSession', () async {
      final effects = _RecordingEffects()
        ..hasOpenAccounts = true
        ..hasFocusedSession = false;
      final machine = MultiAccountMachine(effects: effects)
        ..send(
          const ManifestInitialized(
            hasOpenAccounts: true,
            hasFocusedSession: true,
          ),
        );

      await machine.send(const FocusAccount('user-b'));
      expect(machine.focusState, MultiAccountFocusState.focusedAwaitingSession);
    });

    test('ignored from NoOpenAccounts', () async {
      final effects = _RecordingEffects();
      final machine = MultiAccountMachine(effects: effects);

      await machine.send(const FocusAccount('user-a'));

      expect(machine.focusState, MultiAccountFocusState.noOpenAccounts);
      expect(effects.focusCalls, 0);
    });

    test('from HasOpenAccounts → FocusedWithSession on success', () async {
      final effects = _RecordingEffects()
        ..hasOpenAccounts = true
        ..hasFocusedSession = true;
      final machine = MultiAccountMachine(effects: effects)
        ..send(const AccountOpened(sessionReady: false));

      await machine.send(const FocusAccount('user-a'));
      expect(machine.focusState, MultiAccountFocusState.focusedWithSession);
    });

    test('focus error → FocusedAwaitingSession, not stuck switching', () async {
      final effects = _RecordingEffects()
        ..hasOpenAccounts = true
        ..hasFocusedSession = false
        ..focusShouldThrow = true;
      final machine = MultiAccountMachine(effects: effects)
        ..send(
          const ManifestInitialized(
            hasOpenAccounts: true,
            hasFocusedSession: true,
          ),
        );

      await expectLater(
        machine.send(const FocusAccount('user-b')),
        throwsStateError,
      );
      expect(machine.focusState, MultiAccountFocusState.focusedAwaitingSession);
    });
  });

  group('MultiAccountMachine ReconnectFocusedSession', () {
    test('from FocusedAwaitingSession with session → FocusedWithSession', () async {
      final effects = _RecordingEffects()..hasOpenAccounts = true;
      final machine = MultiAccountMachine(effects: effects)
        ..send(
          const ManifestInitialized(
            hasOpenAccounts: true,
            hasFocusedSession: false,
          ),
        );

      effects.hasFocusedSession = true;
      await machine.send(const ReconnectFocusedSession());

      expect(effects.reconnectCalls, 1);
      expect(machine.focusState, MultiAccountFocusState.focusedWithSession);
    });

    test('ignored outside FocusedAwaitingSession', () async {
      final effects = _RecordingEffects();
      final machine = MultiAccountMachine(effects: effects)
        ..send(
          const ManifestInitialized(
            hasOpenAccounts: true,
            hasFocusedSession: true,
          ),
        );

      await machine.send(const ReconnectFocusedSession());
      expect(effects.reconnectCalls, 0);
      expect(machine.focusState, MultiAccountFocusState.focusedWithSession);
    });
  });

  group('MultiAccountMachine AccountClosed', () {
    test('last account → NoOpenAccounts', () {
      final machine = MultiAccountMachine()
        ..send(
          const ManifestInitialized(
            hasOpenAccounts: true,
            hasFocusedSession: true,
          ),
        );

      machine.send(
        const AccountClosed(wasLastAccount: true, sessionReady: false),
      );
      expect(machine.focusState, MultiAccountFocusState.noOpenAccounts);
    });

    test('non-last with session → FocusedWithSession', () {
      final machine = MultiAccountMachine()
        ..send(
          const ManifestInitialized(
            hasOpenAccounts: true,
            hasFocusedSession: true,
          ),
        );

      machine.send(
        const AccountClosed(wasLastAccount: false, sessionReady: true),
      );
      expect(machine.focusState, MultiAccountFocusState.focusedWithSession);
    });

    test('non-last without session → FocusedAwaitingSession', () {
      final machine = MultiAccountMachine()
        ..send(
          const ManifestInitialized(
            hasOpenAccounts: true,
            hasFocusedSession: true,
          ),
        );

      machine.send(
        const AccountClosed(wasLastAccount: false, sessionReady: false),
      );
      expect(machine.focusState, MultiAccountFocusState.focusedAwaitingSession);
    });
  });

  group('MultiAccountMachine OpenAccount commands', () {
    test('OpenAccountWithPassword → FocusedWithSession', () async {
      final effects = _RecordingEffects();
      final machine = MultiAccountMachine(effects: effects);

      await machine.send(
        const OpenAccountWithPassword(email: 'a@b.com', password: 'secret'),
      );

      expect(machine.focusState, MultiAccountFocusState.focusedWithSession);
    });

    test('OpenAccountWithSignUp → FocusedWithSession', () async {
      final effects = _RecordingEffects();
      final machine = MultiAccountMachine(effects: effects);

      await machine.send(
        const OpenAccountWithSignUp(
          email: 'a@b.com',
          password: 'secret',
          username: 'alice',
          displayName: 'Alice',
        ),
      );

      expect(machine.focusState, MultiAccountFocusState.focusedWithSession);
    });
  });

  group('MultiAccountAdapters', () {
    test('syncFromEffects mirrors manager snapshot', () {
      final effects = _RecordingEffects()
        ..hasOpenAccounts = true
        ..hasFocusedSession = false;
      final machine = MultiAccountMachine(effects: effects);
      final adapters = MultiAccountAdapters(machine, effects: effects);

      adapters.syncFromEffects();

      expect(machine.focusState, MultiAccountFocusState.focusedAwaitingSession);
    });
  });
}
