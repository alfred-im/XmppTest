// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import '../../models/message.dart';
import '../../providers/messages_controller.dart';
import 'messaging_effects.dart';

/// Delega effetti al [MessagesController] esistente — nessun cambio API widget.
class MessagesControllerEffects implements MessagingEffects {
  MessagesControllerEffects(this._controller);

  final MessagesController _controller;

  @override
  Future<void> loadMessages() => _controller.reload();

  @override
  Future<void> markRead() async {
    // markRead è side-effect interno di _init; esposto per completezza modello.
  }

  @override
  void attachRealtime() {
    // Realtime attaccato in _init del controller.
  }

  @override
  Future<void> sendText(String body) => _controller.send(body);

  @override
  Future<void> retryMessage(String clientId) =>
      _controller.retryMessage(clientId);

  @override
  void onRealtimeMessage(ChatMessage message) {
    // Il controller gestisce realtime via callback interna.
  }
}
