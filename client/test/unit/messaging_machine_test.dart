// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:alfred_client/machines/messaging/messaging_effects.dart';
import 'package:alfred_client/machines/messaging/messaging_machine.dart';
import 'package:alfred_client/models/message.dart';
import 'package:flutter_test/flutter_test.dart';

class _RecordingMessagingEffects implements MessagingEffects {
  int loadCount = 0;
  int markReadCount = 0;
  int attachCount = 0;
  int sendCount = 0;
  int retryCount = 0;
  int realtimeMessageCount = 0;
  String? lastSendBody;
  String? lastRetryClientId;

  @override
  Future<void> loadMessages() async {
    loadCount++;
  }

  @override
  Future<void> markRead() async {
    markReadCount++;
  }

  @override
  void attachRealtime() {
    attachCount++;
  }

  @override
  Future<void> sendText(String body) async {
    sendCount++;
    lastSendBody = body;
  }

  @override
  Future<void> retryMessage(String clientId) async {
    retryCount++;
    lastRetryClientId = clientId;
  }

  @override
  void onRealtimeMessage(ChatMessage message) {
    realtimeMessageCount++;
  }
}

ChatMessage _message() => const ChatMessage(
      id: 'msg-1',
      body: 'hello',
      timeLabel: '12:00',
      isMine: false,
    );

void main() {
  group('MessagingMachine load state', () {
    test('InitMessaging carica, segna letto e attacca realtime', () async {
      final effects = _RecordingMessagingEffects();
      final machine = MessagingMachine(effects);

      await machine.send(const InitMessaging());

      expect(machine.loadState, MessagingLoadState.loading);
      expect(machine.realtimeState, MessagingRealtimeState.attached);
      expect(effects.loadCount, 1);
      expect(effects.markReadCount, 1);
      expect(effects.attachCount, 1);
    });

    test('MessagesLoaded → ready', () async {
      final machine = MessagingMachine(_RecordingMessagingEffects());

      await machine.send(const MessagesLoaded());

      expect(machine.loadState, MessagingLoadState.ready);
    });

    test('SessionExpired → sessionBlocked', () async {
      final machine = MessagingMachine(_RecordingMessagingEffects());

      await machine.send(const SessionExpired());

      expect(machine.loadState, MessagingLoadState.sessionBlocked);
    });

    test('LoadFailed resta ready con errore gestito', () async {
      final machine = MessagingMachine(_RecordingMessagingEffects());

      await machine.send(const LoadFailed());

      expect(machine.loadState, MessagingLoadState.ready);
    });

    test('ReloadMessages torna in loading', () async {
      final effects = _RecordingMessagingEffects();
      final machine = MessagingMachine(effects)
        ..loadState = MessagingLoadState.ready;

      await machine.send(const ReloadMessages());

      expect(machine.loadState, MessagingLoadState.loading);
      expect(effects.loadCount, 1);
    });
  });

  group('MessagingMachine send state', () {
    test('SendMessageRequested → sending → SendCompleted → idle', () async {
      final effects = _RecordingMessagingEffects();
      final machine = MessagingMachine(effects)
        ..loadState = MessagingLoadState.ready;

      await machine.send(const SendMessageRequested('ciao'));
      expect(machine.sendState, MessagingSendState.sending);
      expect(effects.sendCount, 1);
      expect(effects.lastSendBody, 'ciao');

      await machine.send(const SendCompleted());
      expect(machine.sendState, MessagingSendState.idle);
    });

    test('SendFailed riporta idle', () async {
      final machine = MessagingMachine(_RecordingMessagingEffects())
        ..loadState = MessagingLoadState.ready
        ..sendState = MessagingSendState.sending;

      await machine.send(const SendFailed());

      expect(machine.sendState, MessagingSendState.idle);
    });

    test('SendMessageRequested ignorato se sessionBlocked', () async {
      final effects = _RecordingMessagingEffects();
      final machine = MessagingMachine(effects)
        ..loadState = MessagingLoadState.sessionBlocked;

      await machine.send(const SendMessageRequested('ciao'));

      expect(effects.sendCount, 0);
      expect(machine.sendState, MessagingSendState.idle);
    });

    test('RetryMessageRequested invoca effetto e torna idle', () async {
      final effects = _RecordingMessagingEffects();
      final machine = MessagingMachine(effects)
        ..loadState = MessagingLoadState.ready;

      await machine.send(const RetryMessageRequested('client-1'));

      expect(effects.retryCount, 1);
      expect(effects.lastRetryClientId, 'client-1');
      expect(machine.sendState, MessagingSendState.idle);
    });
  });

  group('MessagingMachine realtime', () {
    test('RealtimeReceived inoltra messaggio agli effetti', () async {
      final effects = _RecordingMessagingEffects();
      final machine = MessagingMachine(effects);

      await machine.send(RealtimeReceived(_message()));

      expect(effects.realtimeMessageCount, 1);
    });

    test('AttachRealtime e DisposeMessaging gestiscono regione', () async {
      final effects = _RecordingMessagingEffects();
      final machine = MessagingMachine(effects);

      await machine.send(const AttachRealtime());
      expect(machine.realtimeState, MessagingRealtimeState.attached);
      expect(effects.attachCount, 1);

      await machine.send(const DisposeMessaging());
      expect(machine.realtimeState, MessagingRealtimeState.detached);
    });
  });
}
