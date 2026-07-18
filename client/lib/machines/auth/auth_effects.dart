// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import '../../models/profile_summary.dart';

/// Effetti auth → [AccountManager] / servizi (side-effect verso dominio).
abstract class AuthEffects {
  Future<void> signInWithPassword({
    required String email,
    required String password,
  });

  Future<void> signUpOpenAccount({
    required String email,
    required String password,
    required String username,
    required String displayName,
    ProfileKind profileKind,
  });

  Future<bool> isUsernameAvailable(String username);

  Future<void> resetPassword(String email);

  Future<void> syncPushAfterAuth();

  bool get hasOpenAccounts;
}
