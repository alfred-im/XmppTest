// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:alfred_client/machines/auth/auth_machine.dart';
import 'package:alfred_client/machines/multi-account/multi_account_machine.dart';
import 'package:alfred_client/services/account_manager.dart';
import 'package:alfred_client/services/account_storage_service.dart';

import '../support/wiring_test_fixtures.dart';

/// Wiring: AuthSessionCoordinator + AuthMachine + MultiAccountAdapters (effects live).
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('auth wiring', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('initialize senza account → overlay obbligatorio + macchina NoSession', () async {
      final auth = await createWiredAuthController();
      await auth.initialize();

      expect(auth.sessionReady, isTrue);
      expect(auth.showAuthOverlay, isTrue);
      expect(auth.authOverlayDismissible, isFalse);
      expect(auth.authMachine.uiState, AuthUiState.noSession);
      expect(auth.multiAccountMachine.focusState,
          MultiAccountFocusState.noOpenAccounts);
    });

    test('initialize con manifest in storage → SessionActive + focus allineato', () async {
      final storage = AccountStorageService();
      await seedAccountsInStorage(
        storage: storage,
        accounts: [
          openAccount(userId: 'user-a', username: 'alice'),
        ],
        focusUserId: 'user-a',
      );

      final auth = await createWiredAuthController(
        manager: AccountManager(storage: storage),
      );
      await auth.initialize();

      expect(auth.hasOpenAccounts, isTrue);
      expect(auth.showAuthOverlay, isFalse);
      expect(auth.authMachine.uiState, AuthUiState.sessionActive);
      expect(auth.multiAccountMachine.focusUserId, 'user-a');
      expect(auth.userId, 'user-a');
      expect(
        auth.multiAccountMachine.focusState,
        MultiAccountFocusState.focusedWithSession,
      );
    });
  });
}
