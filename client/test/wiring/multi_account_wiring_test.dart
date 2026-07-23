// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:alfred_client/machines/multi-account/multi_account_machine.dart';
import 'package:alfred_client/services/account_manager.dart';
import 'package:alfred_client/services/account_storage_service.dart';

import '../support/wiring_test_fixtures.dart';

/// Wiring: MultiAccountAdapters + AccountMultiAccountEffects + AccountManager.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('multi-account wiring', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('bootstrapManifest allinea macchina e manager', () async {
      final storage = AccountStorageService();
      await seedAccountsInStorage(
        storage: storage,
        accounts: [
          openAccount(userId: 'account-a', username: 'alice'),
          openAccount(userId: 'account-b', username: 'bob'),
        ],
        focusUserId: 'account-a',
      );

      final auth = await createWiredAuthController(
        manager: AccountManager(storage: storage),
      );
      await auth.initialize();

      expect(auth.multiAccountMachine.focusUserId, 'account-a');
      expect(auth.accountManager.focusUserId, 'account-a');
      expect(auth.focusedSession?.userId, 'account-a');
      expect(
        auth.multiAccountMachine.focusState,
        MultiAccountFocusState.focusedWithSession,
      );
    });

    test('focusAccount via adapters aggiorna macchina e manager', () async {
      final storage = AccountStorageService();
      await seedAccountsInStorage(
        storage: storage,
        accounts: [
          openAccount(userId: 'account-a', username: 'alice'),
          openAccount(userId: 'account-b', username: 'bob'),
        ],
        focusUserId: 'account-a',
      );

      final auth = await createWiredAuthController(
        manager: AccountManager(storage: storage),
      );
      await auth.initialize();

      await auth.setFocus('account-b');

      expect(auth.multiAccountMachine.focusUserId, 'account-b');
      expect(auth.accountManager.focusUserId, 'account-b');
      expect(
        auth.multiAccountMachine.focusState,
        MultiAccountFocusState.focusedWithSession,
      );
    });
  });
}
