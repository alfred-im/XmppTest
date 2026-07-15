// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';

import '../models/chat_peer.dart';
import '../providers/auth_controller.dart';
import '../utils/push_platform.dart';

/// Gestisce tap notifica push → focus account + apertura chat.
class PushNotificationListener extends StatefulWidget {
  const PushNotificationListener({
    super.key,
    required this.child,
    @visibleForTesting this.debugOpenChatIntents,
  });

  final Widget child;

  /// Solo test: stream intent senza dipendere da `kIsWeb` / service worker.
  @visibleForTesting
  final Stream<PushOpenChatIntent>? debugOpenChatIntents;

  @override
  State<PushNotificationListener> createState() =>
      _PushNotificationListenerState();
}

class _PushNotificationListenerState extends State<PushNotificationListener> {
  StreamSubscription<PushOpenChatIntent>? _sub;

  @override
  void initState() {
    super.initState();
    final debugStream = widget.debugOpenChatIntents;
    if (debugStream != null) {
      _sub = debugStream.listen(_onOpenChat);
      return;
    }
    if (kIsWeb) {
      PushPlatform.ensureMessageHook();
      _sub = PushPlatform.openChatIntents.listen(_onOpenChat);
    }
  }

  Future<void> _onOpenChat(PushOpenChatIntent intent) async {
    if (!mounted) return;
    final auth = context.read<AuthController>();
    if (!auth.sessionReady) return;

    final conversation = intent.conversation;

    final focused = await auth.focusAccountForPushNotification(
      conversation.ownerUserId,
    );
    if (!focused || !mounted) return;

    final session = auth.focusedSession;
    if (session == null || session.userId != conversation.ownerUserId) return;

    final summary = await session.profileService.findById(
      conversation.peerProfileId,
    );
    if (!mounted || summary == null) return;
    if (summary.id == session.userId) return;

    auth.openConversation(ChatPeer(profile: summary));
    if (kIsWeb) {
      PushPlatform.clearPendingOpenChat();
    }
  }

  void _drainPendingWhenReady() {
    if (!kIsWeb) return;
    final auth = context.read<AuthController>();
    if (!auth.sessionReady) return;
    PushPlatform.tryDrainPendingOpenChat();
  }

  @override
  void dispose() {
    unawaited(_sub?.cancel());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    context.watch<AuthController>();
    WidgetsBinding.instance.addPostFrameCallback((_) => _drainPendingWhenReady());
    return widget.child;
  }
}
