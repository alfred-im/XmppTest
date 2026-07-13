import 'package:flutter/material.dart';

import '../models/profile_summary.dart';
import '../theme/alfred_colors.dart';
import '../utils/avatar_color.dart';

class ProfileAvatar extends StatelessWidget {
  const ProfileAvatar({
    super.key,
    required this.profile,
    this.radius = 26,
    this.fontSize = 18,
    this.onTap,
  });

  final ProfileSummary profile;
  final double radius;
  final double fontSize;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final avatar = CircleAvatar(
      radius: radius,
      backgroundColor: avatarColorForId(profile.id),
      backgroundImage:
          profile.avatarUrl != null ? NetworkImage(profile.avatarUrl!) : null,
      child: profile.avatarUrl == null
          ? Text(
              avatarInitial(profile.displayName),
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: fontSize,
              ),
            )
          : null,
    );

    if (onTap == null) return avatar;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        customBorder: CircleBorder(),
        child: avatar,
      ),
    );
  }
}

class ProfileIdentityLines extends StatelessWidget {
  const ProfileIdentityLines({
    super.key,
    required this.profile,
    this.nameStyle,
    this.usernameStyle,
    this.pronounsStyle,
    this.showUsername = true,
    this.showPronouns = true,
  });

  final ProfileSummary profile;
  final TextStyle? nameStyle;
  final TextStyle? usernameStyle;
  final TextStyle? pronounsStyle;
  final bool showUsername;
  final bool showPronouns;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          profile.displayName,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: nameStyle ??
              const TextStyle(
                fontWeight: FontWeight.w600,
                color: AlfredColors.textPrimary,
              ),
        ),
        if (showUsername && profile.hasUsername) ...[
          const SizedBox(height: 2),
          Text(
            profile.handle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: usernameStyle ??
                const TextStyle(
                  color: AlfredColors.textSecondary,
                  fontSize: 13,
                ),
          ),
        ],
        if (showPronouns && profile.hasPronouns) ...[
          const SizedBox(height: 2),
          Text(
            profile.pronouns!,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: pronounsStyle ??
                const TextStyle(
                  color: AlfredColors.textSecondary,
                  fontSize: 12,
                ),
          ),
        ],
      ],
    );
  }
}
