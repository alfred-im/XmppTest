// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import '../../models/profile_summary.dart';
import 'multi_account_effects.dart';

/// Stato focus account — `docs/model/uml/multi-account/multi-account-state.puml`.
enum MultiAccountFocusState {
  noOpenAccounts,
  hasOpenAccounts,
  focusSwitching,
  focusedWithSession,
  focusedAwaitingSession,
}

/// Eventi — stessi nomi di `docs/domain/multi-account/commands-and-events.md`.
sealed class MultiAccountEvent {
  const MultiAccountEvent();
}

final class ManifestInitialized extends MultiAccountEvent {
  const ManifestInitialized({
    required this.hasOpenAccounts,
    required this.hasFocusedSession,
  });

  final bool hasOpenAccounts;
  final bool hasFocusedSession;
}

final class FocusAccount extends MultiAccountEvent {
  const FocusAccount(this.accountUserId);
  final String accountUserId;
}

final class AccountFocused extends MultiAccountEvent {
  const AccountFocused();
}

final class SessionRestoreFailed extends MultiAccountEvent {
  const SessionRestoreFailed();
}

final class AccountOpened extends MultiAccountEvent {
  const AccountOpened({required this.sessionReady});
  final bool sessionReady;
}

final class AccountClosed extends MultiAccountEvent {
  const AccountClosed({
    required this.wasLastAccount,
    required this.sessionReady,
  });

  final bool wasLastAccount;
  final bool sessionReady;
}

final class ReconnectFocusedSession extends MultiAccountEvent {
  const ReconnectFocusedSession();
}

final class OpenAccountWithPassword extends MultiAccountEvent {
  const OpenAccountWithPassword({
    required this.email,
    required this.password,
  });

  final String email;
  final String password;
}

final class OpenAccountWithSignUp extends MultiAccountEvent {
  const OpenAccountWithSignUp({
    required this.email,
    required this.password,
    required this.username,
    required this.displayName,
    this.profileKind = ProfileKind.user,
  });

  final String email;
  final String password;
  final String username;
  final String displayName;
  final ProfileKind profileKind;
}

final class CloseAccount extends MultiAccountEvent {
  const CloseAccount(this.accountUserId);
  final String accountUserId;
}

/// Macchina multi-account — traccia focus e sessione GoTrue.
class MultiAccountMachine {
  MultiAccountMachine({this._effects});

  final MultiAccountEffects? _effects;

  MultiAccountFocusState focusState = MultiAccountFocusState.noOpenAccounts;

  Future<void> send(MultiAccountEvent event) async {
    switch (event) {
      case ManifestInitialized(
        :final hasOpenAccounts,
        :final hasFocusedSession,
      ):
        _applyManifestInitialized(
          hasOpenAccounts: hasOpenAccounts,
          hasFocusedSession: hasFocusedSession,
        );
      case FocusAccount(:final accountUserId):
        await _handleFocusAccount(accountUserId);
      case AccountFocused():
        _applyAccountFocused();
      case SessionRestoreFailed():
        _applySessionRestoreFailed();
      case AccountOpened(:final sessionReady):
        _applyAccountOpened(sessionReady: sessionReady);
      case AccountClosed(:final wasLastAccount, :final sessionReady):
        _applyAccountClosed(
          wasLastAccount: wasLastAccount,
          sessionReady: sessionReady,
        );
      case ReconnectFocusedSession():
        await _handleReconnectFocusedSession();
      case OpenAccountWithPassword(:final email, :final password):
        await _handleOpenAccountWithPassword(email: email, password: password);
      case OpenAccountWithSignUp(
        :final email,
        :final password,
        :final username,
        :final displayName,
        :final profileKind,
      ):
        await _handleOpenAccountWithSignUp(
          email: email,
          password: password,
          username: username,
          displayName: displayName,
          profileKind: profileKind,
        );
      case CloseAccount(:final accountUserId):
        await _handleCloseAccount(accountUserId);
    }
  }

  Future<void> _handleFocusAccount(String accountUserId) async {
    if (focusState == MultiAccountFocusState.noOpenAccounts) return;

    focusState = MultiAccountFocusState.focusSwitching;

    final effects = _effects;
    if (effects == null) {
      focusState = MultiAccountFocusState.focusedAwaitingSession;
      return;
    }

    try {
      await effects.focusAccount(accountUserId);
      if (effects.hasFocusedSession) {
        _applyAccountFocused();
      } else {
        _applySessionRestoreFailed();
      }
    } catch (_) {
      _applySessionRestoreFailed();
      rethrow;
    }
  }

  Future<void> _handleReconnectFocusedSession() async {
    if (focusState != MultiAccountFocusState.focusedAwaitingSession) return;

    final effects = _effects;
    if (effects == null) return;

    await effects.reconnectFocusedSession();
    if (effects.hasFocusedSession) {
      _applyAccountFocused();
    }
  }

  Future<void> _handleOpenAccountWithPassword({
    required String email,
    required String password,
  }) async {
    final effects = _effects;
    if (effects == null) return;

    await effects.openAccountWithPassword(email: email, password: password);
    _applyAccountOpened(sessionReady: effects.hasFocusedSession);
  }

  Future<void> _handleOpenAccountWithSignUp({
    required String email,
    required String password,
    required String username,
    required String displayName,
    required ProfileKind profileKind,
  }) async {
    final effects = _effects;
    if (effects == null) return;

    await effects.openAccountWithSignUp(
      email: email,
      password: password,
      username: username,
      displayName: displayName,
      profileKind: profileKind,
    );
    _applyAccountOpened(sessionReady: effects.hasFocusedSession);
  }

  Future<void> _handleCloseAccount(String accountUserId) async {
    final effects = _effects;
    if (effects == null) return;
    await effects.closeAccount(accountUserId);
  }

  void _applyManifestInitialized({
    required bool hasOpenAccounts,
    required bool hasFocusedSession,
  }) {
    if (!hasOpenAccounts) {
      focusState = MultiAccountFocusState.noOpenAccounts;
    } else if (hasFocusedSession) {
      focusState = MultiAccountFocusState.focusedWithSession;
    } else {
      focusState = MultiAccountFocusState.focusedAwaitingSession;
    }
  }

  void _applyAccountOpened({required bool sessionReady}) {
    if (focusState == MultiAccountFocusState.noOpenAccounts) {
      focusState = sessionReady
          ? MultiAccountFocusState.focusedWithSession
          : MultiAccountFocusState.hasOpenAccounts;
      return;
    }
    if (sessionReady) {
      focusState = MultiAccountFocusState.focusedWithSession;
    }
  }

  void _applyAccountFocused() {
    focusState = MultiAccountFocusState.focusedWithSession;
  }

  void _applySessionRestoreFailed() {
    switch (focusState) {
      case MultiAccountFocusState.focusSwitching:
      case MultiAccountFocusState.hasOpenAccounts:
        focusState = MultiAccountFocusState.focusedAwaitingSession;
      case MultiAccountFocusState.noOpenAccounts:
      case MultiAccountFocusState.focusedWithSession:
      case MultiAccountFocusState.focusedAwaitingSession:
        break;
    }
  }

  void _applyAccountClosed({
    required bool wasLastAccount,
    required bool sessionReady,
  }) {
    if (wasLastAccount) {
      focusState = MultiAccountFocusState.noOpenAccounts;
      return;
    }
    focusState = sessionReady
        ? MultiAccountFocusState.focusedWithSession
        : MultiAccountFocusState.focusedAwaitingSession;
  }
}
