import 'package:flutter/material.dart';

import '../utils/avatar_color.dart';
import '../utils/date_format.dart';

/// Riga inbox: storico messaggi raggruppato per controparte.
class InboxThread {
  const InboxThread({
    required this.id,
    required this.name,
    required this.preview,
    required this.timeLabel,
    required this.unreadCount,
    required this.avatarColor,
    this.isOnline = false,
    this.lastMessageAt,
    this.protocol = 'internal',
    this.peerProfileId,
    this.peerExternalAddress,
  });

  final String id;
  final String name;
  final String preview;
  final String timeLabel;
  final int unreadCount;
  final Color avatarColor;
  final bool isOnline;
  final DateTime? lastMessageAt;
  final String protocol;
  final String? peerProfileId;
  final String? peerExternalAddress;

  factory InboxThread.fromListRpcRow(Map<String, dynamic> json) {
    final displayName = json['display_name'] as String;
    final lastAt = json['last_message_at'] != null
        ? DateTime.parse(json['last_message_at'] as String)
        : null;

    return InboxThread(
      id: json['thread_id'] as String,
      name: displayName,
      preview: (json['last_message_preview'] as String?) ?? '',
      timeLabel: formatConversationTime(lastAt),
      unreadCount: json['unread_count'] as int? ?? 0,
      avatarColor: avatarColorForId(displayName),
      lastMessageAt: lastAt,
      protocol: json['protocol'] as String? ?? 'internal',
      peerProfileId: json['peer_profile_id'] as String?,
      peerExternalAddress: json['peer_external_address'] as String?,
    );
  }
}
