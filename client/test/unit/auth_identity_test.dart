// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:flutter_test/flutter_test.dart';

import 'package:alfred_client/utils/auth_identity.dart';

void main() {
  group('AuthIdentity', () {
    test('normalizes username to lowercase', () {
      expect(AuthIdentity.normalizeUsername('Mario_Rossi'), 'mario_rossi');
    });

    test('validates username format', () {
      expect(AuthIdentity.isValidUsername('abc'), isTrue);
      expect(AuthIdentity.isValidUsername('ab'), isFalse);
      expect(AuthIdentity.isValidUsername('bad-name'), isFalse);
    });

    test('normalizes email to lowercase', () {
      expect(AuthIdentity.normalizeEmail('Mario@Esempio.IT'), 'mario@esempio.it');
    });

    test('validates email format', () {
      expect(AuthIdentity.isValidEmail('mario@esempio.it'), isTrue);
      expect(AuthIdentity.isValidEmail('not-an-email'), isFalse);
      expect(AuthIdentity.validateEmail(''), 'Inserisci un\'email');
    });
  });
}
