// Copyright (C) 2026 im.alfred
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'package:flutter/material.dart';

import '../models/message.dart';
import '../theme/alfred_colors.dart';
import '../utils/avatar_color.dart';
import 'peer_profile_overlay.dart';

/// Intestazione compatta autore messaggio (chat di gruppo).
class MessageAuthorHeader extends StatelessWidget {
  const MessageAuthorHeader({
    super.key,
    required this.message,
  });

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final name = message.authorDisplayName;
    if (name == null || name.isEmpty) return const SizedBox.shrink();

    final authorProfile = message.toAuthorProfileSummary();
    final profileId = message.authorProfileId ?? message.contentAuthorId;
    final avatarUrl = message.authorAvatarUrl;
    final initial = avatarInitial(name);

    final avatar = CircleAvatar(
      radius: 12,
      backgroundColor: profileId != null
          ? avatarColorForId(profileId)
          : AlfredColors.border,
      backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
      child: avatarUrl == null
          ? Text(
              initial,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            )
          : null,
    );

    final content = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        avatar,
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AlfredColors.textSecondary,
              fontSize: 13,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.1,
            ),
          ),
        ),
      ],
    );

    if (authorProfile == null) {
      return Padding(
        padding: const EdgeInsets.only(left: 4, right: 4, bottom: 4),
        child: content,
      );
    }

    return Padding(
      padding: const EdgeInsets.only(left: 4, right: 4, bottom: 4),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => showPeerProfileOverlay(context, authorProfile),
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
            child: content,
          ),
        ),
      ),
    );
  }
}
