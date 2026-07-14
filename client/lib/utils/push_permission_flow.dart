// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// Logica pura per decidere se tentare la registrazione push (testabile senza browser).
bool shouldAttemptPushSubscription({
  required bool isPushSupported,
  required String? notificationPermission,
}) {
  if (!isPushSupported) return false;
  if (notificationPermission == 'denied') return false;
  return true;
}

/// Dopo subscribe, la subscription va salvata solo con permesso concesso.
bool shouldPersistPushSubscription({
  required String? notificationPermission,
}) {
  return notificationPermission == 'granted';
}
