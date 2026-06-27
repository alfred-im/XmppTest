import 'package:flutter/material.dart';

import '../models/inbox_thread.dart';
import '../theme/alfred_colors.dart';
import '../utils/avatar_color.dart';

class InboxThreadTile extends StatelessWidget {
  const InboxThreadTile({
    super.key,
    required this.thread,
    required this.selected,
    required this.onTap,
  });

  final InboxThread thread;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: selected ? AlfredColors.surface : AlfredColors.panel,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              _Avatar(thread: thread),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            thread.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: AlfredColors.textPrimary,
                            ),
                          ),
                        ),
                        Text(
                          thread.timeLabel,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: thread.unreadCount > 0
                                ? AlfredColors.unreadBadge
                                : AlfredColors.textSecondary,
                            fontWeight: thread.unreadCount > 0
                                ? FontWeight.w600
                                : FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            thread.preview,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: AlfredColors.textSecondary,
                            ),
                          ),
                        ),
                        if (thread.unreadCount > 0) ...[
                          const SizedBox(width: 8),
                          _UnreadBadge(count: thread.unreadCount),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.thread});

  final InboxThread thread;

  @override
  Widget build(BuildContext context) {
    final initial = avatarInitial(thread.name);

    return Stack(
      clipBehavior: Clip.none,
      children: [
        CircleAvatar(
          radius: 26,
          backgroundColor: thread.avatarColor,
          child: Text(
            initial,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w600,
              fontSize: 18,
            ),
          ),
        ),
        if (thread.isOnline)
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                color: AlfredColors.unreadBadge,
                shape: BoxShape.circle,
                border: Border.all(color: AlfredColors.panel, width: 2),
              ),
            ),
          ),
      ],
    );
  }
}

class _UnreadBadge extends StatelessWidget {
  const _UnreadBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 20),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: AlfredColors.unreadBadge,
        borderRadius: BorderRadius.circular(10),
      ),
      alignment: Alignment.center,
      child: Text(
        count > 99 ? '99+' : '$count',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
