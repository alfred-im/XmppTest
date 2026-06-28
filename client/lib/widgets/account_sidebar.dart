import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/saved_account.dart';
import '../providers/auth_controller.dart';
import '../theme/alfred_colors.dart';
import '../utils/avatar_color.dart';

/// Sezione profilo e account nella sidebar / drawer.
class AccountSidebar extends StatelessWidget {
  const AccountSidebar({
    super.key,
    required this.onEditProfile,
    required this.onAddAccount,
    this.onAccountSwitched,
    this.compact = false,
  });

  final VoidCallback onEditProfile;
  final VoidCallback onAddAccount;
  final VoidCallback? onAccountSwitched;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final profile = auth.profile;
    final activeUserId = auth.userId;
    final otherAccounts = auth.savedAccounts
        .where((a) => a.userId != activeUserId)
        .toList();

    return ColoredBox(
      color: AlfredColors.panel,
      child: SafeArea(
        child: ListView(
          padding: EdgeInsets.fromLTRB(12, compact ? 8 : 16, 12, 16),
          children: [
            if (profile != null && activeUserId != null)
              _ActiveProfileCard(
                displayName: profile.displayName,
                username: profile.username,
                pronouns: profile.pronouns,
                avatarUrl: profile.avatarUrl,
                userId: activeUserId,
              )
            else
              const ListTile(
                leading: CircularProgressIndicator(strokeWidth: 2),
                title: Text('Caricamento profilo…'),
              ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onEditProfile,
                icon: const Icon(Icons.edit_outlined, size: 18),
                label: const Text('Modifica profilo'),
              ),
            ),
            if (otherAccounts.isNotEmpty) ...[
              const SizedBox(height: 20),
              Text(
                'Altri account',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: AlfredColors.textSecondary,
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 4),
              ...otherAccounts.map(
                (account) => _AccountTile(
                  account: account,
                  onTap: () => _switchAccount(context, account),
                ),
              ),
            ],
            const SizedBox(height: 8),
            ListTile(
              leading: const Icon(Icons.person_add_alt_1_outlined),
              title: const Text('Aggiungi account'),
              contentPadding: EdgeInsets.zero,
              onTap: onAddAccount,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _switchAccount(BuildContext context, SavedAccount account) async {
    final messenger = ScaffoldMessenger.of(context);
    final auth = context.read<AuthController>();
    final ok = await auth.switchAccount(account);
    if (!ok && auth.error != null) {
      messenger.showSnackBar(SnackBar(content: Text(auth.error!)));
      return;
    }
    onAccountSwitched?.call();
  }
}

class _ActiveProfileCard extends StatelessWidget {
  const _ActiveProfileCard({
    required this.displayName,
    required this.username,
    required this.userId,
    this.pronouns,
    this.avatarUrl,
  });

  final String displayName;
  final String username;
  final String userId;
  final String? pronouns;
  final String? avatarUrl;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        CircleAvatar(
          radius: 28,
          backgroundColor: avatarColorForId(userId),
          backgroundImage:
              avatarUrl != null ? NetworkImage(avatarUrl!) : null,
          child: avatarUrl == null
              ? Text(
                  avatarInitial(displayName),
                  style: const TextStyle(
                    fontSize: 22,
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                )
              : null,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                displayName,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 17,
                  color: AlfredColors.textPrimary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 2),
              Text(
                '@$username',
                style: const TextStyle(
                  color: AlfredColors.textSecondary,
                  fontSize: 13,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (pronouns != null && pronouns!.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  pronouns!,
                  style: const TextStyle(
                    color: AlfredColors.textSecondary,
                    fontSize: 12,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ),
        IconButton(
          icon: const Icon(Icons.logout_outlined, size: 22),
          color: AlfredColors.textSecondary,
          tooltip: 'Esci',
          onPressed: () => context.read<AuthController>().signOut(),
        ),
      ],
    );
  }
}

class _AccountTile extends StatelessWidget {
  const _AccountTile({
    required this.account,
    required this.onTap,
  });

  final SavedAccount account;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: avatarColorForId(account.userId),
        backgroundImage:
            account.avatarUrl != null ? NetworkImage(account.avatarUrl!) : null,
        child: account.avatarUrl == null
            ? Text(
                avatarInitial(account.displayName),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              )
            : null,
      ),
      title: Text(account.displayName),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('@${account.username}'),
          if (account.pronouns != null && account.pronouns!.isNotEmpty)
            Text(
              account.pronouns!,
              style: const TextStyle(fontSize: 12),
            ),
        ],
      ),
      isThreeLine:
          account.pronouns != null && account.pronouns!.isNotEmpty,
      contentPadding: EdgeInsets.zero,
      onTap: onTap,
    );
  }
}
