// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../services/account_session.dart';
import 'chat_peer.dart';

/// Ambito atomico di una conversazione aperta: account + peer + generazione sessione.
///
/// Unico contratto per load, realtime, invio e render messaggi — vedi PROM-CONVERSATION-SCOPE.
class ConversationScope {
  const ConversationScope({
    required this.ownerUserId,
    required this.peerProfileId,
    required this.sessionEpoch,
  }) : assert(ownerUserId != peerProfileId);

  final String ownerUserId;
  final String peerProfileId;

  /// Incrementato a ogni restore/dispose sessione GoTrue per questo account.
  final int sessionEpoch;

  factory ConversationScope.fromSession(
    AccountSession session,
    ChatPeer peer,
  ) {
    return ConversationScope(
      ownerUserId: session.userId,
      peerProfileId: peer.profileId,
      sessionEpoch: session.epoch,
    );
  }

  bool matchesSession(AccountSession session) =>
      session.userId == ownerUserId && session.epoch == sessionEpoch;

  bool matchesPeer(ChatPeer peer) => peer.profileId == peerProfileId;

  bool matches(AccountSession session, ChatPeer peer) =>
      matchesSession(session) && matchesPeer(peer);

  Key get providerKey => ValueKey(
        Object.hash(
          'conversation-scope',
          ownerUserId,
          peerProfileId,
          sessionEpoch,
        ),
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ConversationScope &&
          ownerUserId == other.ownerUserId &&
          peerProfileId == other.peerProfileId &&
          sessionEpoch == other.sessionEpoch;

  @override
  int get hashCode => Object.hash(ownerUserId, peerProfileId, sessionEpoch);
}
