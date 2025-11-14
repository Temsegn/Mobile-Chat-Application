import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/conversation.dart';
import '../models/message.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import 'socket_provider.dart';

class ChatState {
  final List<Conversation> conversations;
  final Map<int, List<Message>> messages; // conversationId -> messages
  final Map<int, bool> typingUsers; // conversationId -> isTyping
  final bool isLoading;
  final String? error;

  ChatState({
    this.conversations = const [],
    this.messages = const {},
    this.typingUsers = const {},
    this.isLoading = false,
    this.error,
  });

  ChatState copyWith({
    List<Conversation>? conversations,
    Map<int, List<Message>>? messages,
    Map<int, bool>? typingUsers,
    bool? isLoading,
    String? error,
  }) {
    return ChatState(
      conversations: conversations ?? this.conversations,
      messages: messages ?? this.messages,
      typingUsers: typingUsers ?? this.typingUsers,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class ChatNotifier extends StateNotifier<ChatState> {
  final SocketService _socketService;

  ChatNotifier(this._socketService) : super(ChatState()) {
    _setupSocketListeners();
  }

  void _setupSocketListeners() {
    _socketService.onNewMessage((message) {
      final currentMessages = Map<int, List<Message>>.from(state.messages);
      final conversationMessages = List<Message>.from(
        currentMessages[message.conversationId] ?? [],
      );
      conversationMessages.add(message);
      currentMessages[message.conversationId] = conversationMessages;
      state = state.copyWith(messages: currentMessages);
    });

    _socketService.onMessageUpdated((message) {
      final currentMessages = Map<int, List<Message>>.from(state.messages);
      final conversationMessages = List<Message>.from(
        currentMessages[message.conversationId] ?? [],
      );
      final index = conversationMessages.indexWhere((m) => m.id == message.id);
      if (index != -1) {
        conversationMessages[index] = message;
        currentMessages[message.conversationId] = conversationMessages;
        state = state.copyWith(messages: currentMessages);
      }
    });

    _socketService.onMessageDeleted((data) {
      final messageId = data['messageId'] as int;
      final conversationId = data['conversationId'] as int;
      final deleteForEveryone = data['deleteForEveryone'] as bool? ?? false;

      final currentMessages = Map<int, List<Message>>.from(state.messages);
      final conversationMessages = List<Message>.from(
        currentMessages[conversationId] ?? [],
      );

      if (deleteForEveryone) {
        conversationMessages.removeWhere((m) => m.id == messageId);
      } else {
        final index = conversationMessages.indexWhere((m) => m.id == messageId);
        if (index != -1) {
          conversationMessages[index] = conversationMessages[index].copyWith(isDeleted: true);
        }
      }

      currentMessages[conversationId] = conversationMessages;
      state = state.copyWith(messages: currentMessages);
    });

    _socketService.onTyping((data) {
      final conversationId = data['conversationId'] as int;
      final isTyping = data['isTyping'] as bool;
      final typingUsers = Map<int, bool>.from(state.typingUsers);
      typingUsers[conversationId] = isTyping;
      state = state.copyWith(typingUsers: typingUsers);
    });

    _socketService.onReactionAdded((data) {
      // Handle reaction added
    });

    _socketService.onReactionRemoved((data) {
      // Handle reaction removed
    });
  }

  Future<void> loadConversations() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final conversations = await ApiService.getConversations();
      state = state.copyWith(conversations: conversations, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadMessages(int conversationId) async {
    try {
      final messages = await ApiService.getMessages(conversationId);
      final currentMessages = Map<int, List<Message>>.from(state.messages);
      currentMessages[conversationId] = messages;
      state = state.copyWith(messages: currentMessages);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> sendMessage({
    required int conversationId,
    required String content,
    String type = "text",
    String? mediaUrl,
    String? fileName,
    int? fileSize,
    List<int>? mentions,
  }) async {
    _socketService.sendMessage(
      conversationId: conversationId,
      content: content,
      type: type,
      mediaUrl: mediaUrl,
      fileName: fileName,
      fileSize: fileSize,
      mentions: mentions,
    );
  }

  Future<void> editMessage(int messageId, String newContent, int conversationId) async {
    _socketService.editMessage(messageId, newContent, conversationId);
  }

  Future<void> deleteMessage(int messageId, int conversationId, {bool deleteForEveryone = false}) async {
    _socketService.deleteMessage(messageId, conversationId, deleteForEveryone: deleteForEveryone);
  }

  void setTyping(int conversationId, bool isTyping) {
    _socketService.setTyping(conversationId, isTyping);
  }

  void addReaction(int messageId, String emoji, int conversationId) {
    _socketService.addReaction(messageId, emoji, conversationId);
  }

  void markAsRead(int messageId, int conversationId) {
    _socketService.markAsRead(messageId, conversationId);
  }

  void joinConversation(int conversationId) {
    _socketService.joinConversation(conversationId);
  }

  void leaveConversation(int conversationId) {
    _socketService.leaveConversation(conversationId);
  }
}

// Extension to add copyWith to Message
extension MessageExtension on Message {
  Message copyWith({
    int? id,
    int? conversationId,
    int? senderId,
    String? content,
    String? type,
    String? mediaUrl,
    String? fileName,
    int? fileSize,
    bool? isEdited,
    bool? isDeleted,
    bool? deletedForEveryone,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Message(
      id: id ?? this.id,
      conversationId: conversationId ?? this.conversationId,
      senderId: senderId ?? this.senderId,
      content: content ?? this.content,
      type: type ?? this.type,
      mediaUrl: mediaUrl ?? this.mediaUrl,
      fileName: fileName ?? this.fileName,
      fileSize: fileSize ?? this.fileSize,
      isEdited: isEdited ?? this.isEdited,
      isDeleted: isDeleted ?? this.isDeleted,
      deletedForEveryone: deletedForEveryone ?? this.deletedForEveryone,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      sender: sender,
      reactions: reactions,
      mentions: mentions,
      readReceipt: readReceipt,
    );
  }
}

final chatProvider = StateNotifierProvider<ChatNotifier, ChatState>((ref) {
  final socketService = ref.watch(socketServiceProvider);
  return ChatNotifier(socketService);
});

