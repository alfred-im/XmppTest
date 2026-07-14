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
  const PushNotificationListener({super.key, required this.child});

  final Widget child;

  @override
  State<PushNotificationListener> createState() =>
      _PushNotificationListenerState();
}

class _PushNotificationListenerState extends State<PushNotificationListener> {
  StreamSubscription<PushOpenChatIntent>? _sub;

  @override
  void initState() {
    super.initState();
    if (kIsWeb) {
      PushPlatform.ensureMessageHook();
      _sub = PushPlatform.openChatIntents.listen(_onOpenChat);
    }
  }

  Future<void> _onOpenChat(PushOpenChatIntent intent) async {
    if (!mounted) return;
    final auth = context.read<AuthController>();
    if (auth.userId != intent.recipientUserId) {
      await auth.setFocus(intent.recipientUserId);
    }
    if (!mounted) return;
    final session = auth.focusedSession;
    if (session == null) return;

    final summary = await session.profileService.findById(
      intent.peerProfileId,
    );
    if (!mounted || summary == null) return;

    auth.openConversation(ChatPeer(profile: summary));
  }

  @override
  void dispose() {
    unawaited(_sub?.cancel());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
