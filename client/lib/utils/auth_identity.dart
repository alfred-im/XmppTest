// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// Validazione username (identità pubblica IM) ed email (solo auth/recupero).
class AuthIdentity {
  AuthIdentity._();

  static final usernamePattern = RegExp(r'^[a-z0-9_]{3,32}$');
  static final emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

  static String normalizeUsername(String input) => input.trim().toLowerCase();

  static String normalizeEmail(String input) => input.trim().toLowerCase();

  static bool isValidUsername(String username) =>
      usernamePattern.hasMatch(username);

  static bool isValidEmail(String email) => emailPattern.hasMatch(email);

  static String? validateUsername(String input) {
    final normalized = normalizeUsername(input);
    if (normalized.isEmpty) return 'Inserisci un username';
    if (!isValidUsername(normalized)) {
      return 'Username: 3–32 caratteri, solo lettere minuscole, numeri e _';
    }
    return null;
  }

  static String? validateEmail(String input) {
    final normalized = normalizeEmail(input);
    if (normalized.isEmpty) return 'Inserisci un\'email';
    if (!isValidEmail(normalized)) return 'Email non valida';
    return null;
  }
}
