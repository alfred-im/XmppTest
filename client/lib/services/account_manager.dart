import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/account_view_state.dart';
import '../models/chat_peer.dart';
import '../models/open_account.dart';
import '../utils/auth_redirect_url.dart';
import 'account_session.dart';
import 'account_storage_service.dart';

/// Gestisce account messaggistica aperti in parallelo e il focus UI.
///
/// Un solo percorso per popolare la RAM: leggere il manifest e [AccountSession.restore]
/// per ogni token. Vale per F5 ([initialize]) e per aggiunta account (dopo upsert).
class AccountManager {
  AccountManager({AccountStorageService? storage})
      : _storage = storage ?? AccountStorageService();

  final AccountStorageService _storage;
  final Map<String, AccountSession> _sessions = {};
  final Map<String, AccountViewState> _viewsByAccount = {};
  final Set<String> _testOnlyAccountIds = {};
  String? _focusUserId;

  List<OpenAccount> get openAccounts =>
      _sessions.values.map((s) => s.toOpenAccount()).toList();

  List<AccountSession> get sessions => _sessions.values.toList();

  AccountSession? get focusedSession =>
      _focusUserId != null ? _sessions[_focusUserId] : null;

  String? get focusUserId => _focusUserId;

  AccountViewState get viewState => _viewFor(_focusUserId);

  bool get hasOpenAccounts => _sessions.isNotEmpty;

  void openConversation(ChatPeer peer) {
    final userId = _focusUserId;
    if (userId == null || peer.profileId == userId) return;
    _setViewFor(userId, _storedViewFor(userId).openChat(peer));
  }

  void showInboxOnMobile() {
    final userId = _focusUserId;
    if (userId == null) return;
    _setViewFor(userId, _storedViewFor(userId).backToInboxOnMobile());
  }

  void mergeActivePeerFromInbox(ChatPeer inboxRow) {
    final userId = _focusUserId;
    if (userId == null) return;
    _setViewFor(userId, _storedViewFor(userId).mergeActivePeer(inboxRow));
  }

  AccountViewState _viewFor(String? userId) {
    if (userId == null) return const AccountViewState();
    return _sanitizeView(userId, _storedViewFor(userId));
  }

  AccountViewState _storedViewFor(String userId) =>
      _viewsByAccount[userId] ?? const AccountViewState();

  AccountViewState _sanitizeView(String userId, AccountViewState view) =>
      view.sanitizedForAccount(userId);

  void _setViewFor(String userId, AccountViewState view) {
    _viewsByAccount[userId] = _sanitizeView(userId, view);
  }

  bool _hasAccount(String userId) =>
      _sessions.containsKey(userId) || _testOnlyAccountIds.contains(userId);

  @visibleForTesting
  void seedTestAccount(String userId) {
    _testOnlyAccountIds.add(userId);
  }

  @visibleForTesting
  void injectTestSession(AccountSession session) {
    _sessions[session.userId] = session;
    session.wireStorage(_storage);
  }

  /// F5 / avvio app: ricostruisce tutta la RAM dal manifest.
  Future<void> initialize() async {
    await _rebuildFromManifest();
  }

  /// Scrive il token nel manifest e ricostruisce tutta la RAM (come F5).
  Future<AccountSession> openWithPassword({
    required String email,
    required String password,
  }) async {
    await _pauseAuthListeners();
    try {
      final account = await AccountSession.signInOpenAccount(
        email: email,
        password: password,
      );
      await _storage.upsertAccount(account);
      final session = await _rebuildFromManifest(
        focusUserId: account.userId,
        requireSession: true,
      );
      return session!;
    } finally {
      await _resumeAuthListeners();
    }
  }

  Future<AccountSession> openWithSignUp({
    required String email,
    required String password,
    required String username,
    required String displayName,
  }) async {
    await _pauseAuthListeners();
    try {
      final account = await AccountSession.signUpOpenAccount(
        email: email,
        password: password,
        username: username,
        displayName: displayName,
      );
      await _storage.upsertAccount(account);
      final session = await _rebuildFromManifest(
        focusUserId: account.userId,
        requireSession: true,
      );
      return session!;
    } finally {
      await _resumeAuthListeners();
    }
  }

  /// Legge [alfred_saved_accounts], butta le sessioni in RAM e le ricrea da token.
  Future<AccountSession?> _rebuildFromManifest({
    String? focusUserId,
    bool requireSession = false,
  }) async {
    await _disposeSessionsInRam(clearAuthStorage: false);

    final stored = await _storage.loadAccounts();
    final savedFocus = focusUserId ?? await _storage.loadFocusUserId();

    for (final account in stored) {
      if (account.refreshToken.isEmpty) {
        await _storage.removeAccount(account.userId);
        continue;
      }
      try {
        final session = await _restoreWithRetry(account);
        _sessions[session.userId] = session;
      } catch (e) {
        if (_isPermanentAuthFailure(e)) {
          await _storage.removeAccount(account.userId);
        }
      }
    }

    for (final session in _sessions.values) {
      session.wireStorage(_storage);
    }

    if (_sessions.isEmpty) {
      _focusUserId = null;
      if (requireSession) {
        throw const AuthException('Sessione account non disponibile.');
      }
      return null;
    }

    if (savedFocus != null && _sessions.containsKey(savedFocus)) {
      _focusUserId = savedFocus;
    } else {
      _focusUserId = _sessions.keys.first;
    }
    await _storage.saveFocusUserId(_focusUserId);

    await _syncAllProfiles();
    return focusedSession;
  }

  Future<void> _disposeSessionsInRam({required bool clearAuthStorage}) async {
    for (final session in _sessions.values.toList()) {
      await session.disposeResources(clearAuthStorage: clearAuthStorage);
    }
    _sessions.clear();
  }

  Future<void> _pauseAuthListeners() async {
    for (final session in _sessions.values) {
      await session.pauseAuthListener();
    }
  }

  Future<void> _resumeAuthListeners() async {
    for (final session in _sessions.values) {
      session.resumeAuthListener();
    }
  }

  Future<AccountSession> _restoreWithRetry(OpenAccount account) async {
    Object? lastError;
    for (var attempt = 0; attempt < 3; attempt++) {
      try {
        return await AccountSession.restore(account);
      } catch (e) {
        lastError = e;
        if (_isPermanentAuthFailure(e)) rethrow;
        if (attempt < 2) {
          await Future<void>.delayed(Duration(milliseconds: 300 * (attempt + 1)));
        }
      }
    }
    throw lastError ?? const AuthException('Ripristino account non riuscito.');
  }

  Future<void> setFocus(String userId) async {
    if (!_hasAccount(userId)) return;
    _focusUserId = userId;
    await _storage.saveFocusUserId(userId);
    // Inbox del focus: ricarica on-read al cambio account (realtime in background
    // può non aggiornare la UI se nessun listener era attivo sul controller).
    await _sessions[userId]?.inboxController.load();
  }

  Future<void> removeAccount(String userId) async {
    final session = _sessions.remove(userId);
    _testOnlyAccountIds.remove(userId);
    _viewsByAccount.remove(userId);
    if (session != null) {
      await session.clearStoredAccount();
    }

    if (_focusUserId == userId) {
      _focusUserId = _sessions.keys.isEmpty ? null : _sessions.keys.first;
      await _storage.saveFocusUserId(_focusUserId);
    }
  }

  bool _isPermanentAuthFailure(Object e) {
    if (e is AuthException) {
      final msg = e.message.toLowerCase();
      return msg.contains('invalid refresh') ||
          msg.contains('refresh token not found') ||
          msg.contains('session expired') ||
          msg.contains('token has expired');
    }
    return false;
  }

  Future<void> _syncAllProfiles() async {
    for (final session in _sessions.values) {
      try {
        await session.syncProfileSummary();
        await session.updateStoredProfile(session.profile);
      } catch (_) {
        // Mantieni la sessione ripristinata anche se il sync profilo fallisce.
      }
    }
  }

  Future<void> refreshOpenAccountProfiles() => _syncAllProfiles();

  Future<bool> isUsernameAvailable(String username) async {
    final client = _sessions.values.isEmpty
        ? AccountSession.createBootstrapClient()
        : _sessions.values.first.client;
    final normalized = username.trim().toLowerCase();
    final available = await client.rpc(
      'is_username_available',
      params: {'p_username': normalized},
    );
    return available == true;
  }

  Future<void> resetPassword(String email) async {
    final client = AccountSession.createBootstrapClient();
    final normalizedEmail = email.trim().toLowerCase();
    await client.auth.resetPasswordForEmail(
      normalizedEmail,
      redirectTo: AuthRedirectUrl.resolve(),
    );
  }

  Future<void> dispose() async {
    await _disposeSessionsInRam(clearAuthStorage: true);
    _viewsByAccount.clear();
    _testOnlyAccountIds.clear();
    _focusUserId = null;
  }
}
