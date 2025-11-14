import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../providers/chat_provider.dart';
import '../providers/auth_provider.dart';
import '../models/conversation.dart';
import 'chat_screen.dart';
import 'login_screen.dart';
import 'create_group_screen.dart';
import 'search_screen.dart';

class ChatListScreen extends ConsumerStatefulWidget {
  const ChatListScreen({super.key});

  @override
  ConsumerState<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends ConsumerState<ChatListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(chatProvider.notifier).loadConversations();
    });
  }

  @override
  Widget build(BuildContext context) {
    final chatState = ref.watch(chatProvider);
    final authNotifier = ref.read(authProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chats'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const SearchScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.group_add),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const CreateGroupScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await authNotifier.logout();
              if (mounted) {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              }
            },
          ),
        ],
      ),
      body: chatState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : chatState.conversations.isEmpty
              ? const Center(child: Text('No conversations yet'))
              : RefreshIndicator(
                  onRefresh: () => ref.read(chatProvider.notifier).loadConversations(),
                  child: ListView.builder(
                    itemCount: chatState.conversations.length,
                    itemBuilder: (context, index) {
                      final conversation = chatState.conversations[index];
                      return ConversationTile(conversation: conversation);
                    },
                  ),
                ),
    );
  }
}

class ConversationTile extends StatelessWidget {
  final Conversation conversation;

  const ConversationTile({super.key, required this.conversation});

  String _getTitle() {
    if (conversation.type == 'group') {
      return conversation.name ?? 'Group Chat';
    }
    return conversation.participant?.username ?? 'Unknown';
  }

  String? _getSubtitle() {
    if (conversation.lastMessage == null) return 'No messages yet';
    if (conversation.lastMessageType == 'image') return '📷 Image';
    if (conversation.lastMessageType == 'video') return '🎥 Video';
    if (conversation.lastMessageType == 'file') return '📎 File';
    return conversation.lastMessage;
  }

  Widget? _getAvatar() {
    if (conversation.type == 'group') {
      return CircleAvatar(
        backgroundColor: Colors.blue,
        child: Text(conversation.name?[0].toUpperCase() ?? 'G'),
      );
    }
    return CircleAvatar(
      backgroundColor: Colors.grey,
      child: Text(conversation.participant?.username[0].toUpperCase() ?? '?'),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: _getAvatar(),
      title: Text(_getTitle()),
      subtitle: Text(_getSubtitle() ?? ''),
      trailing: conversation.lastMessageTime != null
          ? Text(
              timeago.format(conversation.lastMessageTime!),
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            )
          : null,
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ChatScreen(conversationId: conversation.conversationId),
          ),
        );
      },
    );
  }
}

