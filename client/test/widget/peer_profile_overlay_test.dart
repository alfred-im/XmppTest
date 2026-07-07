import 'package:alfred_client/models/message.dart';
import 'package:alfred_client/models/profile_summary.dart';
import 'package:alfred_client/providers/contacts_controller.dart';
import 'package:alfred_client/providers/reception_allowlist_controller.dart';
import 'package:alfred_client/widgets/peer_profile_overlay.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import '../support/fake_contact_service.dart';
import '../support/fake_reception_allowlist_service.dart';

void main() {
  final peer = ProfileSummary(
    id: 'peer-id',
    username: 'mario',
    displayName: 'Mario Rossi',
    pronouns: 'lui/egli',
  );

  test('toAuthorProfileSummary builds partial profile', () {
    final message = ChatMessage(
      id: 'm1',
      body: 'ciao',
      timeLabel: '12:00',
      isMine: false,
      authorDisplayName: 'Mario',
      authorProfileId: 'peer-id',
      originalAuthorId: 'peer-id',
    );

    final profile = message.toAuthorProfileSummary();

    expect(profile?.id, 'peer-id');
    expect(profile?.displayName, 'Mario');
  });

  testWidgets('PeerProfileOverlay shows identity and actions', (tester) async {
    final allowlistService = FakeReceptionAllowlistService();
    final contactService = FakeContactService();
    final allowlist = ReceptionAllowlistController(
      ownerId: 'owner-id',
      allowlistService: allowlistService,
    );
    final contacts = ContactsController(
      ownerId: 'owner-id',
      contactService: contactService,
    );

    await allowlist.load();
    await contacts.load();

    await tester.pumpWidget(
      MaterialApp(
        home: MultiProvider(
          providers: [
            ChangeNotifierProvider<ReceptionAllowlistController>.value(
              value: allowlist,
            ),
            ChangeNotifierProvider<ContactsController>.value(
              value: contacts,
            ),
          ],
          child: PeerProfileOverlay(profile: peer),
        ),
      ),
    );

    expect(find.text('Mario Rossi'), findsOneWidget);
    expect(find.text('@mario'), findsOneWidget);
    expect(find.text('lui/egli'), findsOneWidget);
    expect(find.text('Consenti messaggi'), findsOneWidget);
    expect(find.text('Aggiungi alla rubrica'), findsOneWidget);
  });
}
