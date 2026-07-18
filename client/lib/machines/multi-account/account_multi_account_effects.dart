// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import '../../models/profile_summary.dart';
import '../../providers/auth_controller.dart';
import '../../services/account_manager.dart';
import '../../services/navigation_coordinator.dart';
import 'multi_account_effects.dart';

/// Effetti multi-account → [AccountManager] e [NavigationCoordinator].
class AccountMultiAccountEffects implements MultiAccountEffects {
  AccountMultiAccountEffects(this._auth, this._navigation);

  final AuthController _auth;
  final NavigationCoordinator _navigation;

  AccountManager get _manager => _auth.accountManager;

  @override
  bool get hasFocusedSession => _manager.focusedSession != null;

  @override
  bool get hasOpenAccounts => _manager.hasOpenAccounts;

  @override
  Future<void> focusAccount(String accountUserId) {
    return _navigation.switchToAccount(accountUserId);
  }

  @override
  Future<void> reconnectFocusedSession() {
    return _manager.reconnectFocusedSession();
  }

  @override
  Future<void> openAccountWithPassword({
    required String email,
    required String password,
  }) {
    return _manager.openWithPassword(email: email, password: password);
  }

  @override
  Future<void> openAccountWithSignUp({
    required String email,
    required String password,
    required String username,
    required String displayName,
    ProfileKind profileKind = ProfileKind.user,
  }) {
    return _manager.openWithSignUp(
      email: email,
      password: password,
      username: username,
      displayName: displayName,
      profileKind: profileKind,
    );
  }

  @override
  Future<void> closeAccount(String accountUserId) {
    return _manager.removeAccount(accountUserId);
  }
}
