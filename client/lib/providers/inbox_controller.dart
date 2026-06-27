import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/inbox_thread.dart';
import '../services/inbox_service.dart';
import '../services/supabase_bootstrap.dart';
import '../utils/list_filter.dart';

class InboxController extends ChangeNotifier {
  InboxController({
    required this.userId,
    InboxService? inboxService,
    this.enableRealtime = true,
  }) : _inboxService = inboxService ?? InboxService() {
    unawaited(_bootstrap());
  }

  final String userId;
  final bool enableRealtime;
  final InboxService _inboxService;
  RealtimeChannel? _channel;
  int _loadGeneration = 0;
  bool _realtimeAttached = false;

  List<InboxThread> threads = [];
  bool isLoading = true;
  String? error;
  String _searchQuery = '';

  List<InboxThread> get filteredThreads => filterByQueryFields(
        threads,
        _searchQuery,
        (thread) => [thread.name, thread.preview],
      );

  void setSearchQuery(String value) {
    _searchQuery = value;
    notifyListeners();
  }

  InboxThread? findByPeerProfileId(String profileId) {
    for (final thread in threads) {
      if (thread.peerProfileId == profileId) return thread;
    }
    return null;
  }

  Future<void> _bootstrap() async {
    await load();
    if (enableRealtime) _attachRealtime();
  }

  void _attachRealtime() {
    if (_realtimeAttached) return;
    _realtimeAttached = true;
    _channel = _inboxService.subscribeToInbox(userId, load);
  }

  Future<void> load() async {
    final generation = ++_loadGeneration;
    isLoading = true;
    error = null;
    notifyListeners();

    try {
      final loaded = await _inboxService
          .fetchInbox()
          .timeout(const Duration(seconds: 30));
      if (generation != _loadGeneration) return;
      threads = loaded;
      error = null;
    } on TimeoutException {
      if (generation != _loadGeneration) return;
      error = 'Timeout caricamento inbox. Riprova.';
    } catch (e) {
      if (generation != _loadGeneration) return;
      error = e.toString();
    } finally {
      if (generation == _loadGeneration) {
        isLoading = false;
        notifyListeners();
      }
    }
  }

  @override
  void dispose() {
    disposeRealtimeChannel(_channel);
    super.dispose();
  }
}
