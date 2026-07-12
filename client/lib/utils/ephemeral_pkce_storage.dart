// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:supabase_flutter/supabase_flutter.dart';

/// Storage in-memory per il code verifier PKCE su client auth effimeri.
///
/// PKCE (flusso auth predefinito Supabase) deve salvare temporaneamente un
/// «code verifier» mentre parte `resetPasswordForEmail` / OAuth. È separato
/// dalla sessione utente ([EmptyLocalStorage]): qui non serve persistenza su
/// disco, solo RAM per la durata del flusso.
class EphemeralPkceStorage implements GotrueAsyncStorage {
  final Map<String, String> _store = {};

  @override
  Future<String?> getItem({required String key}) async => _store[key];

  @override
  Future<void> removeItem({required String key}) async => _store.remove(key);

  @override
  Future<void> setItem({required String key, required String value}) async {
    _store[key] = value;
  }
}
