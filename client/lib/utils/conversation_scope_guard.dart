// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import '../models/chat_peer.dart';
import '../models/conversation_scope.dart';
import '../services/account_session.dart';

/// True se [scope] (congelato nel [MessagesController]) è ancora l'ambito attivo.
///
/// INV-MSG-1: owner+peer+loadSeq del controller devono coincidere con scope commesso
/// e sessione live. Non usare solo [ConversationScope.matches] sullo scope congelato.
bool isMessagesScopeActive({
  required ConversationScope scope,
  required ConversationScope? committedScope,
  required ChatPeer peer,
  required AccountSession? liveSession,
  required bool Function(AccountSession session, ChatPeer peer)
      isConversationReady,
}) {
  if (committedScope == null) return false;
  if (committedScope != scope) return false;
  if (liveSession == null) return false;
  if (liveSession.userId != scope.ownerUserId) return false;
  if (peer.profileId != scope.peerProfileId) return false;
  return isConversationReady(liveSession, peer);
}
