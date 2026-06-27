import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/compose_target.dart';
import '../models/conversation.dart';
import '../providers/auth_controller.dart';
import '../providers/conversations_controller.dart';
import '../providers/messages_controller.dart';
import '../services/compose_service.dart';
import '../theme/alfred_colors.dart';
import '../widgets/account_sidebar.dart';
import '../widgets/chat_panel.dart';
import '../widgets/conversations_panel.dart';
import 'contacts_screen.dart';
import 'auth_screen.dart';
import 'profile_screen.dart';

/// Layout principale stile WhatsApp Web: sidebar (profilo + conversazioni) + chat.
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

  Conversation? _findSelected(ConversationsController controller) {
    final id = _selectedId;
    if (id == null) return null;
    for (final c in controller.conversations) {
      if (c.id == id) return c;
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

  Future<void> _startConversationFromAddress(String address) async {
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

  Future<void> _onConversationCreated(String conversationId) async {
    if (!mounted) return;
    await context.read<ConversationsController?>()?.load();
    if (!mounted) return;
    setState(() {
      _draftTarget = null;
      _selectedId = conversationId;
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

  Widget _conversationsPanel({
    required ConversationsController conversations,
    required bool showDrawerButton,
    bool showBackButton = false,
    bool showTopBar = true,
    VoidCallback? onBack,
  }) {
    return ConversationsPanel(
      selectedId: _selectedId,
      conversations: conversations.filteredConversations,
      isLoading: conversations.isLoading,
      error: conversations.error,
      onRetry: conversations.load,
      onSelected: (id) => setState(() {
        _selectedId = id;
        _draftTarget = null;
        _showListOnMobile = false;
      }),
      onSearchChanged: conversations.setSearchQuery,
      onDrawerTap: showDrawerButton ? _openDrawer : null,
      onContactsTap: _openContacts,
      onNewConversation: _startConversationFromAddress,
      showBackButton: showBackButton,
      onBack: onBack,
      showTopBar: showTopBar,
    );
  }

  Widget _chatArea({
    required Conversation? selected,
    required bool showBackButton,
    VoidCallback? onBack,
  }) {
    if (selected != null) {
      return _ChatWithMessages(
        key: ValueKey(selected.id),
        conversation: selected,
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
        onConversationCreated: _onConversationCreated,
      );
    }

    return const EmptyChatPlaceholder();
  }

  @override
  Widget build(BuildContext context) {
    final conversations = context.watch<ConversationsController?>();
    if (conversations == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final width = MediaQuery.sizeOf(context).width;
    final isWide = width >= _breakpoint;
    final selected = _findSelected(conversations);
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
                      child: _conversationsPanel(
                        conversations: conversations,
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
          ? _conversationsPanel(
              conversations: conversations,
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
    required this.conversation,
    this.showBackButton = false,
    this.onBack,
  });

  final Conversation conversation;
  final bool showBackButton;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final userId = context.read<AuthController>().userId!;

    return ChangeNotifierProvider(
      create: (_) => MessagesController(
        userId: userId,
        conversationId: conversation.id,
      ),
      child: ChatPanel(
        conversation: conversation,
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
    required this.onConversationCreated,
    this.showBackButton = false,
    this.onBack,
  });

  final ComposeTarget target;
  final Future<void> Function(String conversationId) onConversationCreated;
  final bool showBackButton;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final userId = context.read<AuthController>().userId!;

    return ChangeNotifierProvider(
      create: (_) => MessagesController(
        userId: userId,
        composeTarget: target,
        onConversationCreated: onConversationCreated,
      ),
      child: ChatPanel(
        conversation: target.toPlaceholderConversation(),
        showBackButton: showBackButton,
        onBack: onBack,
      ),
    );
  }
}
