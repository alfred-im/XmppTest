import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/compose_target.dart';
import '../models/inbox_thread.dart';
import '../providers/auth_controller.dart';
import '../providers/inbox_controller.dart';
import '../providers/messages_controller.dart';
import '../services/compose_service.dart';
import '../theme/alfred_colors.dart';
import '../widgets/account_sidebar.dart';
import '../widgets/chat_panel.dart';
import '../widgets/inbox_panel.dart';
import 'contacts_screen.dart';
import 'auth_screen.dart';
import 'profile_screen.dart';

/// Layout principale stile WhatsApp Web: sidebar (profilo + inbox) + chat.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final _composeService = ComposeService();
  String? _selectedId;
  ComposeTarget? _draftTarget;
  bool _showListOnMobile = true;

  static const _breakpoint = 720.0;

  InboxThread? _findSelected(InboxController controller) {
    final id = _selectedId;
    if (id == null) return null;
    for (final thread in controller.threads) {
      if (thread.id == id) return thread;
    }
    return null;
  }

  void _openDrawer() => _scaffoldKey.currentState?.openDrawer();

  void _closeDrawer() => _scaffoldKey.currentState?.closeDrawer();

  Future<void> _openContacts() async {
    _closeDrawer();
    final target = await Navigator.push<ComposeTarget>(
      context,
      MaterialPageRoute(builder: (_) => const ContactsScreen()),
    );
    if (!mounted || target == null) return;
    _openDraft(target);
  }

  Future<void> _startMessageFromAddress(String address) async {
    try {
      final target = await _composeService.resolveAddress(address);
      if (!mounted) return;
      _openDraft(target);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('StateError: ', ''))),
      );
    }
  }

  void _openDraft(ComposeTarget target) {
    setState(() {
      _draftTarget = target;
      _selectedId = null;
      _showListOnMobile = false;
    });
  }

  Future<void> _onFirstMessageSent() async {
    if (!mounted) return;
    final draft = _draftTarget;
    final inbox = context.read<InboxController?>();
    if (inbox == null || draft?.profileId == null) return;

    await inbox.load();
    if (!mounted) return;

    final thread = inbox.findByPeerProfileId(draft!.profileId!);
    setState(() {
      _draftTarget = null;
      _selectedId = thread?.id;
      _showListOnMobile = false;
    });
  }

  Future<void> _openProfile() async {
    _closeDrawer();
    await Navigator.push<void>(
      context,
      MaterialPageRoute(builder: (_) => const ProfileScreen()),
    );
  }

  Future<void> _openAddAccount() async {
    _closeDrawer();
    final auth = context.read<AuthController>();
    final navigator = Navigator.of(context);
    await auth.prepareAddAccount();
    await navigator.push<void>(
      MaterialPageRoute(
        builder: (routeCtx) => AuthScreen(
          addingAccount: true,
          onCancel: () => Navigator.of(routeCtx).pop(),
        ),
      ),
    );
  }

  Widget _accountSidebar({bool compact = false}) {
    return AccountSidebar(
      compact: compact,
      onEditProfile: _openProfile,
      onAddAccount: _openAddAccount,
      onAccountSwitched: () {
        _closeDrawer();
        setState(() {
          _selectedId = null;
          _draftTarget = null;
          _showListOnMobile = true;
        });
      },
    );
  }

  Widget _inboxPanel({
    required InboxController inbox,
    required bool showDrawerButton,
    bool showBackButton = false,
    bool showTopBar = true,
    VoidCallback? onBack,
  }) {
    return InboxPanel(
      selectedId: _selectedId,
      threads: inbox.filteredThreads,
      isLoading: inbox.isLoading,
      error: inbox.error,
      onRetry: inbox.load,
      onSelected: (id) => setState(() {
        _selectedId = id;
        _draftTarget = null;
        _showListOnMobile = false;
      }),
      onSearchChanged: inbox.setSearchQuery,
      onDrawerTap: showDrawerButton ? _openDrawer : null,
      onContactsTap: _openContacts,
      onNewMessage: _startMessageFromAddress,
      showBackButton: showBackButton,
      onBack: onBack,
      showTopBar: showTopBar,
    );
  }

  Widget _chatArea({
    required InboxThread? selected,
    required bool showBackButton,
    VoidCallback? onBack,
  }) {
    if (selected != null) {
      return _ChatWithMessages(
        key: ValueKey(selected.id),
        thread: selected,
        showBackButton: showBackButton,
        onBack: onBack,
      );
    }

    final draft = _draftTarget;
    if (draft != null) {
      return _DraftChat(
        key: ValueKey('draft:${draft.address}'),
        target: draft,
        showBackButton: showBackButton,
        onBack: onBack,
        onFirstMessageSent: _onFirstMessageSent,
      );
    }

    return const EmptyChatPlaceholder();
  }

  @override
  Widget build(BuildContext context) {
    final inbox = context.watch<InboxController?>();
    if (inbox == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final width = MediaQuery.sizeOf(context).width;
    final isWide = width >= _breakpoint;
    final selected = _findSelected(inbox);
    final showChatOnMobile = selected != null || _draftTarget != null;
    final sidebarWidth = width >= 1100 ? 380.0 : 320.0;

    if (isWide) {
      return Scaffold(
        body: Row(
          children: [
            SizedBox(
              width: sidebarWidth,
              child: ColoredBox(
                color: AlfredColors.panel,
                child: Column(
                  children: [
                    _accountSidebar(compact: true),
                    const Divider(height: 1),
                    Expanded(
                      child: _inboxPanel(
                        inbox: inbox,
                        showDrawerButton: false,
                        showTopBar: false,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const VerticalDivider(width: 1, color: AlfredColors.border),
            Expanded(
              child: _chatArea(
                selected: selected,
                showBackButton: false,
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      key: _scaffoldKey,
      drawer: Drawer(
        child: _accountSidebar(),
      ),
      body: !showChatOnMobile || _showListOnMobile
          ? _inboxPanel(
              inbox: inbox,
              showDrawerButton: true,
            )
          : _chatArea(
              selected: selected,
              showBackButton: true,
              onBack: () => setState(() => _showListOnMobile = true),
            ),
    );
  }
}

class _ChatWithMessages extends StatelessWidget {
  const _ChatWithMessages({
    super.key,
    required this.thread,
    this.showBackButton = false,
    this.onBack,
  });

  final InboxThread thread;
  final bool showBackButton;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final userId = context.read<AuthController>().userId!;

    return ChangeNotifierProvider(
      create: (_) => MessagesController(
        userId: userId,
        threadId: thread.id,
        peerProfileId: thread.peerProfileId,
      ),
      child: ChatPanel(
        thread: thread,
        showBackButton: showBackButton,
        onBack: onBack,
      ),
    );
  }
}

class _DraftChat extends StatelessWidget {
  const _DraftChat({
    super.key,
    required this.target,
    required this.onFirstMessageSent,
    this.showBackButton = false,
    this.onBack,
  });

  final ComposeTarget target;
  final Future<void> Function() onFirstMessageSent;
  final bool showBackButton;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final userId = context.read<AuthController>().userId!;

    return ChangeNotifierProvider(
      create: (_) => MessagesController(
        userId: userId,
        composeTarget: target,
        onFirstMessageSent: onFirstMessageSent,
      ),
      child: ChatPanel(
        thread: target.toPlaceholderThread(),
        showBackButton: showBackButton,
        onBack: onBack,
      ),
    );
  }
}
