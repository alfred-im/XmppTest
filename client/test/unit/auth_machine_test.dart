// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:alfred_client/machines/auth/auth_machine.dart';
import 'package:flutter_test/flutter_test.dart';

// spec: SURF-AUTH-002, SURF-AUTH-003, SURF-AUTH-005, SURF-AUTH-007
void main() {
  group('AuthMachine bootstrap', () {
    test('starts bootstrapping then noSession when manifest empty', () {
      final machine = AuthMachine();

      expect(machine.uiState, AuthUiState.bootstrapping);
      expect(machine.showOverlay, isFalse);

      machine.send(const BootstrapStarted());
      expect(machine.isBootstrapping, isTrue);

      machine.send(const BootstrapCompleted(hasOpenAccounts: false));
      expect(machine.uiState, AuthUiState.noSession);
      expect(machine.showOverlay, isTrue);
      expect(machine.overlayDismissible, isFalse);
    });

    test('bootstrap with accounts → sessionActive', () {
      final machine = AuthMachine()
        ..send(const BootstrapStarted())
        ..send(const BootstrapCompleted(hasOpenAccounts: true));

      expect(machine.uiState, AuthUiState.sessionActive);
      expect(machine.showOverlay, isFalse);
    });
  });

  group('AuthMachine overlay', () {
    test('open dismissible overlay from sessionActive', () {
      final machine = AuthMachine()
        ..send(const BootstrapCompleted(hasOpenAccounts: true))
        ..send(const OverlayOpenRequested(dismissible: true));

      expect(machine.uiState, AuthUiState.overlayVisible);
      expect(machine.showOverlay, isTrue);
      expect(machine.overlayDismissible, isTrue);
    });

    test('close dismissible overlay returns to sessionActive', () {
      final machine = AuthMachine()
        ..send(const BootstrapCompleted(hasOpenAccounts: true))
        ..send(const OverlayOpenRequested(dismissible: true))
        ..send(const OverlayCloseRequested());

      expect(machine.uiState, AuthUiState.sessionActive);
      expect(machine.showOverlay, isFalse);
    });

    test('close blocked in noSession', () {
      final machine = AuthMachine()
        ..send(const BootstrapCompleted(hasOpenAccounts: false))
        ..send(const OverlayCloseRequested());

      expect(machine.uiState, AuthUiState.noSession);
      expect(machine.showOverlay, isTrue);
    });

    test('last account removed → mandatory overlay', () {
      final machine = AuthMachine()
        ..send(const BootstrapCompleted(hasOpenAccounts: true))
        ..send(const LastAccountRemoved());

      expect(machine.uiState, AuthUiState.noSession);
      expect(machine.overlayDismissible, isFalse);
    });
  });

  group('AuthMachine auth operations', () {
    test('successful login from noSession → sessionActive', () {
      final machine = AuthMachine()
        ..send(const BootstrapCompleted(hasOpenAccounts: false))
        ..send(const AuthOperationStarted())
        ..send(const AuthOperationCompleted(success: true));

      expect(machine.uiState, AuthUiState.sessionActive);
      expect(machine.showOverlay, isFalse);
    });

    test('failed login restores noSession', () {
      final machine = AuthMachine()
        ..send(const BootstrapCompleted(hasOpenAccounts: false))
        ..send(const AuthOperationStarted())
        ..send(const AuthOperationFailed());

      expect(machine.uiState, AuthUiState.noSession);
      expect(machine.showOverlay, isTrue);
    });

    test('failed login from overlayVisible restores overlay', () {
      final machine = AuthMachine()
        ..send(const BootstrapCompleted(hasOpenAccounts: true))
        ..send(const OverlayOpenRequested(dismissible: true))
        ..send(const AuthOperationStarted())
        ..send(const AuthOperationFailed());

      expect(machine.uiState, AuthUiState.overlayVisible);
    });

    test('validation rejected does not enter authOperationInProgress', () {
      final machine = AuthMachine()
        ..send(const BootstrapCompleted(hasOpenAccounts: false))
        ..send(const ValidationRejected());

      expect(machine.uiState, AuthUiState.noSession);
      expect(machine.isAuthOperationInProgress, isFalse);
    });
  });
}
