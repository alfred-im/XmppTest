// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import '../../models/message.dart';
import 'messaging_effects.dart';

/// Stato caricamento — `docs/model/uml/messaging/messaging-state.puml`.
enum MessagingLoadState {
  loading,
  ready,
  sessionBlocked,
}

/// Stato invio serializzato per conversazione.
enum MessagingSendState {
  idle,
  sending,
}

/// Regione parallela subscription Realtime.
enum MessagingRealtimeState {
  detached,
  attached,
}

/// Eventi — `docs/domain/messaging/commands-and-events.md`.
sealed class MessagingEvent {
  const MessagingEvent();
}

final class InitMessaging extends MessagingEvent {
  const InitMessaging();
}

final class ReloadMessages extends MessagingEvent {
  const ReloadMessages();
}

final class MessagesLoaded extends MessagingEvent {
  const MessagesLoaded();
}

final class LoadFailed extends MessagingEvent {
  const LoadFailed();
}

final class SessionExpired extends MessagingEvent {
  const SessionExpired();
}

final class SendMessageRequested extends MessagingEvent {
  const SendMessageRequested(this.body);
  final String body;
}

final class SendCompleted extends MessagingEvent {
  const SendCompleted();
}

final class SendFailed extends MessagingEvent {
  const SendFailed();
}

final class RetryMessageRequested extends MessagingEvent {
  const RetryMessageRequested(this.clientId);
  final String clientId;
}

final class RealtimeReceived extends MessagingEvent {
  const RealtimeReceived(this.message);
  final ChatMessage message;
}

final class AttachRealtime extends MessagingEvent {
  const AttachRealtime();
}

final class DisposeMessaging extends MessagingEvent {
  const DisposeMessaging();
}

/// Interprete statechart messaging — allineato a UML.
///
/// Il percorso produzione resta [MessagesController]; questa macchina
/// documenta transizioni load/send/realtime e supporta test unitari.
class MessagingMachine {
  MessagingMachine(this._effects);

  final MessagingEffects _effects;

  MessagingLoadState loadState = MessagingLoadState.loading;
  MessagingSendState sendState = MessagingSendState.idle;
  MessagingRealtimeState realtimeState = MessagingRealtimeState.detached;

  Future<void> send(MessagingEvent event) async {
    switch (event) {
      case InitMessaging():
        loadState = MessagingLoadState.loading;
        await _effects.loadMessages();
        _effects.attachRealtime();
        await _effects.markRead();
        realtimeState = MessagingRealtimeState.attached;
      case ReloadMessages():
        loadState = MessagingLoadState.loading;
        await _effects.loadMessages();
      case MessagesLoaded():
        loadState = MessagingLoadState.ready;
      case LoadFailed():
        loadState = MessagingLoadState.ready;
      case SessionExpired():
        loadState = MessagingLoadState.sessionBlocked;
      case SendMessageRequested(:final body):
        if (loadState == MessagingLoadState.sessionBlocked) return;
        sendState = MessagingSendState.sending;
        await _effects.sendText(body);
      case SendCompleted():
        sendState = MessagingSendState.idle;
      case SendFailed():
        sendState = MessagingSendState.idle;
      case RetryMessageRequested(:final clientId):
        if (sendState == MessagingSendState.sending) return;
        sendState = MessagingSendState.sending;
        await _effects.retryMessage(clientId);
        sendState = MessagingSendState.idle;
      case RealtimeReceived(:final message):
        _effects.onRealtimeMessage(message);
      case AttachRealtime():
        _effects.attachRealtime();
        realtimeState = MessagingRealtimeState.attached;
      case DisposeMessaging():
        realtimeState = MessagingRealtimeState.detached;
    }
  }
}
