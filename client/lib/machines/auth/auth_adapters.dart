// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'auth_machine.dart';

/// Adapter UI → eventi [AuthMachine].
class AuthAdapters {
  AuthAdapters(this._machine);

  final AuthMachine _machine;

  void onBootstrapStarted() {
    _machine.send(const BootstrapStarted());
  }

  void onBootstrapCompleted({required bool hasOpenAccounts}) {
    _machine.send(BootstrapCompleted(hasOpenAccounts: hasOpenAccounts));
  }

  void onOverlayOpen({required bool dismissible}) {
    _machine.send(OverlayOpenRequested(dismissible: dismissible));
  }

  void onOverlayClose() {
    _machine.send(const OverlayCloseRequested());
  }

  void onLastAccountRemoved() {
    _machine.send(const LastAccountRemoved());
  }

  void onValidationRejected() {
    _machine.send(const ValidationRejected());
  }

  void onAuthOperationStarted() {
    _machine.send(const AuthOperationStarted());
  }

  void onAuthOperationCompleted({required bool success}) {
    _machine.send(AuthOperationCompleted(success: success));
  }

  void onAuthOperationFailed() {
    _machine.send(const AuthOperationFailed());
  }
}
