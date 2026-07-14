// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// Configurazione runtime Alfred (publishable key — sicura lato client).
class AppConfig {
  const AppConfig._();

  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://tvwpoxxcqwphryvuyqzu.supabase.co',
  );

  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2d3BveHhjcXdwaHJ5dnV5cXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNTkzODAsImV4cCI6MjA5NzczNTM4MH0.u85Ze5hAtZp6P-3-LSrb0QM2nSG1cfM1I6hddCov0_M',
  );

  /// Identificatore server IM di questa istanza (`username@server` locale).
  static const imServerId = String.fromEnvironment(
    'ALFRED_IM_SERVER',
    defaultValue: 'alfred.app',
  );

  /// VAPID public key per Web Push (publishable).
  static const vapidPublicKey = String.fromEnvironment(
    'VAPID_PUBLIC_KEY',
    defaultValue:
        'BIUztTni13vzA9Jo8so7xIRTNF5FHWjxb3mV4V0T9O8G_InKfZwp5_z7Ue8AMJGRBeehWf_2gSiL9rdqJXawefg',
  );
}
