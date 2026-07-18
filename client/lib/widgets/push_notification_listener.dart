// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';

import '../providers/auth_controller.dart';
import '../utils/diagnostic_log.dart';
import '../utils/push_platform.dart';

/// Gestisce tap notifica push → focus account + apertura chat.
class PushNotificationListener extends StatefulWidget {
  const PushNotificationListener({
    super.key,
    required this.child,
    @visibleForTesting this.debugOpenChatIntents,
  });

  final Widget child;

  @visibleForTesting
  final Stream<PushOpenChatIntent>? debugOpenChatIntents;

  @override
  State<PushNotificationListener> createState() =>
      PushNotificationListenerState();
}

class PushNotificationListenerState extends State<PushNotificationListener> {
  StreamSubscription<PushOpenChatIntent>? _sub;
  bool _drainScheduled = false;
  Future<void> _openChatChain = Future<void>.value();

  @override
  void initState() {
    super.initState();
    final debugStream = widget.debugOpenChatIntents;
    if (debugStream != null) {
      _sub = debugStream.listen(_enqueueOpenChat);
      return;
    }
    if (kIsWeb) {
      PushPlatform.ensureMessageHook();
      _sub = PushPlatform.openChatIntents.listen(_enqueueOpenChat);
    }
  }

  void _enqueueOpenChat(PushOpenChatIntent intent) {
    diagLog(
      'push',
      'handler.enqueue',
      data: {
        'recipientUserId': intent.conversation.ownerUserId,
        'peerProfileId': intent.conversation.peerProfileId,
      },
    );
    _openChatChain = _openChatChain.then((_) async {
      await _handleOpenChat(intent);
    });
  }

  /// Test: esegue il percorso tap push senza dipendere dal timing dello stream.
  @visibleForTesting
  Future<void> processOpenChatForTest(PushOpenChatIntent intent) async {
    await _handleOpenChat(intent);
  }

  Future<void> _handleOpenChat(PushOpenChatIntent intent) async {
    final conversation = intent.conversation;
    if (!mounted) {
      diagLogFail(
        'push',
        'handler.open_chat',
        'unmounted',
        data: {'recipientUserId': conversation.ownerUserId},
      );
      return;
    }
    final auth = context.read<AuthController>();
    if (!auth.sessionReady) {
      diagLogFail('push', 'handler.open_chat', 'session_not_ready');
      if (kIsWeb) {
        PushPlatform.persistPendingOpenChat(conversation);
      }
      return;
    }

    if (!auth.accountManager.hasOpenAccount(conversation.ownerUserId)) {
      diagLogFail(
        'push',
        'handler.open_chat',
        'no_open_account',
        data: {'recipientUserId': conversation.ownerUserId},
      );
      if (kIsWeb) PushPlatform.clearPendingOpenChat();
      return;
    }

    final opened = await auth.openConversationAfterPushTap(
      recipientUserId: conversation.ownerUserId,
      peerProfileId: conversation.peerProfileId,
    );

    if (!mounted) return;

    if (opened) {
      if (kIsWeb) {
        PushPlatform.clearPendingOpenChat();
      }
    } else if (kIsWeb) {
      PushPlatform.clearPendingOpenChat();
    }
  }

  void _scheduleDrainPending() {
    if (!kIsWeb || _drainScheduled) return;
    final auth = context.read<AuthController>();
    if (!auth.sessionReady) return;
    _drainScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _drainScheduled = false;
      if (!mounted) return;
      PushPlatform.tryDrainPendingOpenChat();
    });
  }

  @override
  void dispose() {
    unawaited(_sub?.cancel());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    context.watch<AuthController>();
    _scheduleDrainPending();
    return widget.child;
  }
}
