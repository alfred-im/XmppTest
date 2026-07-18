// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import '../../models/chat_peer.dart';
import '../../services/account_manager.dart';
import '../../services/account_session.dart';
import '../../utils/diagnostic_log.dart';
import 'navigation_effects.dart';

/// Implementazione effetti navigation — logica ex-[NavigationCoordinator].
class AccountNavigationEffects implements NavigationEffects {
  AccountNavigationEffects(this._manager);

  final AccountManager _manager;

  @override
  Future<void> focusAccount(String accountUserId) async {
    await _manager.setFocus(accountUserId);
  }

  @override
  void openPeerOnFocusedAccount(ChatPeer peer) {
    final focus = _manager.focusUserId;
    if (focus == null || peer.profileId == focus) {
      diagLogFail(
        'nav',
        'open_peer',
        focus == null ? 'no_focus' : 'self_peer',
        data: {'peerProfileId': peer.profileId},
      );
      return;
    }
    _manager.openConversation(peer);
    diagLog(
      'nav',
      'open_peer',
      data: {'accountUserId': focus, 'peerProfileId': peer.profileId},
    );
  }

  @override
  Future<bool> openConversationOnAccount({
    required String accountUserId,
    required String peerProfileId,
    required bool allowProfileFallback,
  }) async {
    diagLog(
      'nav',
      'open_on_account.start',
      data: {
        'accountUserId': accountUserId,
        'peerProfileId': peerProfileId,
        'focusBefore': _manager.focusUserId,
      },
    );

    if (accountUserId == peerProfileId) {
      diagLogFail(
        'nav',
        'open_on_account',
        'self_peer',
        data: {'accountUserId': accountUserId},
      );
      return false;
    }

    if (!await _ensureAccountFocused(accountUserId)) {
      return false;
    }

    final session = _manager.focusedSession;
    if (session == null || session.userId != accountUserId) {
      diagLogFail(
        'nav',
        'open_on_account',
        'wrong_session',
        data: {
          'expected': accountUserId,
          'actual': session?.userId,
        },
      );
      return false;
    }

    final peer = await _resolvePeerInInbox(
      session: session,
      peerProfileId: peerProfileId,
      allowProfileFallback: allowProfileFallback,
    );

    if (peer == null) {
      diagLogFail(
        'nav',
        'open_on_account',
        'peer_not_found',
        data: {'peerProfileId': peerProfileId},
      );
      return false;
    }

    _manager.openConversation(peer);
    diagLog(
      'nav',
      'open_on_account.ok',
      data: {'accountUserId': accountUserId, 'peerProfileId': peerProfileId},
    );
    return true;
  }

  @override
  Future<bool> openConversationFromPushTap({
    required String accountUserId,
    required String peerProfileId,
  }) async {
    diagLog(
      'nav',
      'open_from_push.start',
      data: {
        'accountUserId': accountUserId,
        'peerProfileId': peerProfileId,
        'focusBefore': _manager.focusUserId,
      },
    );

    if (accountUserId == peerProfileId) {
      diagLogFail(
        'nav',
        'open_from_push',
        'self_peer',
        data: {'accountUserId': accountUserId},
      );
      return false;
    }

    _manager.clearConversationForAccount(accountUserId);

    if (!await _ensureAccountFocused(accountUserId)) {
      return false;
    }

    final session = _manager.focusedSession;
    if (session == null || session.userId != accountUserId) {
      diagLogFail(
        'nav',
        'open_from_push',
        'wrong_session',
        data: {
          'expected': accountUserId,
          'actual': session?.userId,
        },
      );
      return false;
    }

    final peer = await _resolvePeerForPushTap(
      session: session,
      peerProfileId: peerProfileId,
    );

    if (peer == null) {
      diagLogFail(
        'nav',
        'open_from_push',
        'peer_not_found',
        data: {'peerProfileId': peerProfileId},
      );
      return false;
    }

    _manager.openConversation(peer);
    diagLog(
      'nav',
      'open_from_push.ok',
      data: {'accountUserId': accountUserId, 'peerProfileId': peerProfileId},
    );
    return true;
  }

  Future<bool> _ensureAccountFocused(String accountUserId) async {
    diagLog(
      'nav',
      'focus.start',
      data: {
        'accountUserId': accountUserId,
        'focusBefore': _manager.focusUserId,
      },
    );

    if (!_manager.hasOpenAccount(accountUserId)) {
      diagLogFail(
        'nav',
        'focus',
        'no_open_account',
        data: {'accountUserId': accountUserId},
      );
      return false;
    }

    await _manager.setFocus(accountUserId);

    final session = _manager.focusedSession;
    final ok = _manager.focusUserId == accountUserId &&
        session != null &&
        session.userId == accountUserId;

    if (ok) {
      diagLog('nav', 'focus.ok', data: {'accountUserId': accountUserId});
    } else {
      diagLogFail(
        'nav',
        'focus',
        'session_mismatch',
        data: {
          'accountUserId': accountUserId,
          'focusAfter': _manager.focusUserId,
          'sessionUserId': session?.userId,
        },
      );
    }
    return ok;
  }

  Future<ChatPeer?> resolvePeerInInboxForTest({
    required AccountSession session,
    required String peerProfileId,
    bool allowProfileFallback = true,
  }) {
    return _resolvePeerInInbox(
      session: session,
      peerProfileId: peerProfileId,
      allowProfileFallback: allowProfileFallback,
    );
  }

  Future<ChatPeer?> _resolvePeerInInbox({
    required AccountSession session,
    required String peerProfileId,
    required bool allowProfileFallback,
  }) async {
    if (peerProfileId == session.userId) return null;

    await session.inboxController.load();

    var peer = session.inboxController.findByProfileId(peerProfileId);
    if (peer != null && peer.profileId != session.userId) {
      diagLog(
        'nav',
        'resolve_peer',
        data: {'source': 'inbox', 'attempt': 0},
      );
      return peer;
    }

    for (var attempt = 1; attempt < 10; attempt++) {
      if (session.inboxController.isLoading) {
        await Future<void>.delayed(const Duration(milliseconds: 50));
        continue;
      }
      await session.inboxController.load();
      peer = session.inboxController.findByProfileId(peerProfileId);
      if (peer != null && peer.profileId != session.userId) {
        diagLog(
          'nav',
          'resolve_peer',
          data: {'source': 'inbox', 'attempt': attempt},
        );
        return peer;
      }
      break;
    }

    if (!allowProfileFallback) return null;

    try {
      final summary = await session.profileService.findById(peerProfileId);
      if (summary != null && summary.id != session.userId) {
        diagLog(
          'nav',
          'resolve_peer',
          data: {'source': 'profile_fallback'},
        );
        return ChatPeer(profile: summary);
      }
    } catch (e) {
      diagLogFail(
        'nav',
        'resolve_peer',
        'profile_lookup_error',
        data: {'error': e.runtimeType.toString()},
      );
    }

    return null;
  }

  static const _pushInboxRetryAttempts = 12;
  static const _pushInboxRetryDelay = Duration(milliseconds: 100);

  Future<ChatPeer?> _resolvePeerForPushTap({
    required AccountSession session,
    required String peerProfileId,
  }) async {
    if (peerProfileId == session.userId) return null;

    for (var attempt = 0; attempt < _pushInboxRetryAttempts; attempt++) {
      if (session.inboxController.isLoading) {
        await Future<void>.delayed(_pushInboxRetryDelay);
        continue;
      }

      await session.inboxController.load();
      final peer = session.inboxController.findByProfileId(peerProfileId);
      if (peer != null && peer.profileId != session.userId) {
        diagLog(
          'nav',
          'resolve_peer_push',
          data: {'source': 'inbox', 'attempt': attempt},
        );
        return peer;
      }

      if (attempt < _pushInboxRetryAttempts - 1) {
        await Future<void>.delayed(_pushInboxRetryDelay);
      }
    }

    try {
      final summary = await session.profileService.findById(peerProfileId);
      if (summary != null && summary.id != session.userId) {
        diagLog(
          'nav',
          'resolve_peer_push',
          data: {'source': 'profile_fallback'},
        );
        return ChatPeer(profile: summary);
      }
    } catch (e) {
      diagLogFail(
        'nav',
        'resolve_peer_push',
        'profile_lookup_error',
        data: {'error': e.runtimeType.toString()},
      );
    }

    return null;
  }
}
