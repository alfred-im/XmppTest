// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import '../../models/profile_summary.dart';

/// Effetti collaterali del contesto multi-account → [AccountManager].
abstract class MultiAccountEffects {
  Future<void> focusAccount(String accountUserId);

  Future<void> reconnectFocusedSession();

  Future<void> openAccountWithPassword({
    required String email,
    required String password,
  });

  Future<void> openAccountWithSignUp({
    required String email,
    required String password,
    required String username,
    required String displayName,
    ProfileKind profileKind = ProfileKind.user,
  });

  Future<void> closeAccount(String accountUserId);

  /// Dopo init o sync: sessione GoTrue attiva per il focus corrente.
  bool get hasFocusedSession;

  /// Manifest con almeno un account aperto.
  bool get hasOpenAccounts;
}
