// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import '../../models/message.dart';

/// Effetti messaging → [MessagesController] e servizi collegati.
abstract class MessagingEffects {
  Future<void> loadMessages();

  Future<void> markRead();

  void attachRealtime();

  Future<void> sendText(String body);

  Future<void> retryMessage(String clientId);

  void onRealtimeMessage(ChatMessage message);
}
