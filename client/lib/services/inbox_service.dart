import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/inbox_thread.dart';
import 'supabase_bootstrap.dart';

class InboxService {
  Future<List<InboxThread>> fetchInbox() async {
    final rows = await supabase.rpc('list_inbox');

    final threads = (rows as List<dynamic>)
        .map(
          (row) => InboxThread.fromListRpcRow(
            row as Map<String, dynamic>,
          ),
        )
        .toList();

    threads.sort((a, b) {
      final aTime = a.lastMessageAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bTime = b.lastMessageAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bTime.compareTo(aTime);
    });

    return threads;
  }

  Future<void> markRead(String threadId) async {
    await supabase.rpc(
      'mark_thread_read',
      params: {'p_thread_id': threadId},
    );
  }

  RealtimeChannel subscribeToInbox(
    String userId,
    void Function() onChange,
  ) {
    return supabase
        .channel('inbox-$userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'inbox_threads',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'owner_id',
            value: userId,
          ),
          callback: (_) => onChange(),
        )
        .subscribe();
  }
}
