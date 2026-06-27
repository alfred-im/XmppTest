import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:alfred_client/models/inbox_thread.dart';
import 'package:alfred_client/providers/inbox_controller.dart';
import 'package:alfred_client/services/inbox_service.dart';

class _AuthModel extends ChangeNotifier {
  bool sessionReady = true;
  String? userId = 'user-1';
}

class _ImmediateInboxService extends InboxService {
  @override
  Future<List<InboxThread>> fetchInbox() async {
    return const [
      InboxThread(
        id: 't1',
        name: 'Alice',
        preview: 'Ciao',
        timeLabel: '12:00',
        unreadCount: 0,
        avatarColor: Color(0xFF000000),
        peerProfileId: 'peer-1',
      ),
    ];
  }
}

void main() {
  testWidgets(
    'ChangeNotifierProxyProvider rebuilds when InboxController notifies',
    (tester) async {
      final auth = _AuthModel();

      await tester.pumpWidget(
        MaterialApp(
          home: ChangeNotifierProvider<_AuthModel>.value(
            value: auth,
            child: ChangeNotifierProxyProvider<_AuthModel, InboxController?>(
              create: (_) => null,
              update: (_, auth, previous) {
                if (!auth.sessionReady || auth.userId == null) return null;
                return InboxController(
                  userId: auth.userId!,
                  inboxService: _ImmediateInboxService(),
                  enableRealtime: false,
                );
              },
              child: Builder(
                builder: (context) {
                  final inbox = context.watch<InboxController?>();
                  if (inbox == null || inbox.isLoading) {
                    return const Text('loading');
                  }
                  return Text('ready:${inbox.threads.length}');
                },
              ),
            ),
          ),
        ),
      );

      expect(find.text('loading'), findsOneWidget);

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('ready:1'), findsOneWidget);
    },
  );
}
