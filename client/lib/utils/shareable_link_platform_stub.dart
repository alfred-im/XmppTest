// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// Cattura il fragment all'avvio (no-op fuori web).
void captureBootShareableFragment() {}

String? readShareableFragment() => null;

void clearShareableFragment() {}

Stream<String?> watchShareableFragment() => const Stream.empty();
