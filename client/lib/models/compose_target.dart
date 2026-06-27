import 'inbox_thread.dart';
import '../utils/avatar_color.dart';

/// Destinatario di una bozza chat — nessun thread server finché non parte un messaggio.
class ComposeTarget {
  const ComposeTarget._({
    required this.address,
    required this.displayName,
    required this.isExternal,
    this.profileId,
  });

  final String address;
  final String displayName;
  final bool isExternal;
  final String? profileId;

  factory ComposeTarget.internal({
    required String address,
    required String displayName,
    required String profileId,
  }) {
    return ComposeTarget._(
      address: address,
      displayName: displayName,
      isExternal: false,
      profileId: profileId,
    );
  }

  factory ComposeTarget.external({
    required String address,
    required String displayName,
  }) {
    return ComposeTarget._(
      address: address,
      displayName: displayName,
      isExternal: true,
    );
  }

  InboxThread toPlaceholderThread() {
    return InboxThread(
      id: 'draft:$address',
      name: displayName,
      preview: '',
      timeLabel: '',
      unreadCount: 0,
      avatarColor: avatarColorForId(displayName),
      peerProfileId: profileId,
    );
  }
}
