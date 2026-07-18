// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import '../../models/profile_summary.dart';
import 'multi_account_effects.dart';
import 'multi_account_machine.dart';

/// Mappa ingressi attuali → eventi macchina multi-account.
///
/// UML: `docs/model/uml/multi-account/seq-focus-switch.puml`
class MultiAccountAdapters {
  MultiAccountAdapters(this._machine, {this.effects});

  final MultiAccountMachine _machine;
  final MultiAccountEffects? effects;

  void onManifestInitialized({
    required bool hasOpenAccounts,
    required bool hasFocusedSession,
  }) {
    _machine.send(
      ManifestInitialized(
        hasOpenAccounts: hasOpenAccounts,
        hasFocusedSession: hasFocusedSession,
      ),
    );
  }

  Future<void> focusAccount(String accountUserId) {
    return _machine.send(FocusAccount(accountUserId));
  }

  Future<void> reconnectFocusedSession() {
    return _machine.send(const ReconnectFocusedSession());
  }

  Future<void> openAccountWithPassword({
    required String email,
    required String password,
  }) {
    return _machine.send(
      OpenAccountWithPassword(email: email, password: password),
    );
  }

  Future<void> openAccountWithSignUp({
    required String email,
    required String password,
    required String username,
    required String displayName,
    ProfileKind profileKind = ProfileKind.user,
  }) {
    return _machine.send(
      OpenAccountWithSignUp(
        email: email,
        password: password,
        username: username,
        displayName: displayName,
        profileKind: profileKind,
      ),
    );
  }

  void onAccountOpened({required bool sessionReady}) {
    _machine.send(AccountOpened(sessionReady: sessionReady));
  }

  void onAccountClosed({
    required bool wasLastAccount,
    bool? sessionReady,
  }) {
    _machine.send(
      AccountClosed(
        wasLastAccount: wasLastAccount,
        sessionReady: sessionReady ?? effects?.hasFocusedSession ?? false,
      ),
    );
  }

  void syncFromEffects() {
    final effects = this.effects;
    if (effects == null) return;
    onManifestInitialized(
      hasOpenAccounts: effects.hasOpenAccounts,
      hasFocusedSession: effects.hasFocusedSession,
    );
  }
}
