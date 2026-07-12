// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// Realtime relevance for mailbox archive rows (owner + peer).
bool isMailboxPeerMessageRelevant({
  required Map<String, dynamic> record,
  required String currentUserId,
  required String peerProfileId,
}) {
  final owner = record['owner_id'] as String?;
  final peer = record['peer_profile_id'] as String?;
  return owner == currentUserId && peer == peerProfileId;
}
