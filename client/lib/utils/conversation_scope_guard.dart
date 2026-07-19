// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import '../models/chat_peer.dart';
import '../models/conversation_scope.dart';
import '../services/account_session.dart';

/// True se [scope] (congelato nel [MessagesController]) è ancora l'ambito attivo.
///
/// INV-MSG-1: la guardia non può usare solo lo stato globale navigation —
/// deve coincidere con owner+peer+epoch del controller.
bool isMessagesScopeActive({
  required ConversationScope scope,
  required ChatPeer peer,
  required AccountSession? liveSession,
  required bool Function(AccountSession session, ChatPeer peer)
      isConversationReady,
}) {
  if (liveSession == null) return false;
  return scope.matches(liveSession, peer) &&
      isConversationReady(liveSession, peer);
}
