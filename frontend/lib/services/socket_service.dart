import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/message.dart';

class SocketService {
  IO.Socket? _socket;
  static const String baseUrl = 'http://localhost:4000';
  // Change to your backend URL: 'http://YOUR_IP:4000' for mobile testing

  Future<void> connect() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');

    if (token == null) return;

    _socket = IO.io(
      baseUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableAutoConnect()
          .build(),
    );

    _socket!.connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  // Conversation events
  void joinConversation(int conversationId) {
    _socket?.emit('joinConversation', {'conversationId': conversationId});
  }

  void leaveConversation(int conversationId) {
    _socket?.emit('leaveConversation', {'conversationId': conversationId});
  }

  // Message events
  void sendMessage({
    required int conversationId,
    required String content,
    String type = "text",
    String? mediaUrl,
    String? fileName,
    int? fileSize,
    List<int>? mentions,
  }) {
    _socket?.emit('sendMessage', {
      'conversationId': conversationId,
      'content': content,
      'type': type,
      'mediaUrl': mediaUrl,
      'fileName': fileName,
      'fileSize': fileSize,
      'mentions': mentions,
    });
  }

  void editMessage(int messageId, String newContent, int conversationId) {
    _socket?.emit('editMessage', {
      'messageId': messageId,
      'newContent': newContent,
      'conversationId': conversationId,
    });
  }

  void deleteMessage(int messageId, int conversationId, {bool deleteForEveryone = false}) {
    _socket?.emit('deleteMessage', {
      'messageId': messageId,
      'conversationId': conversationId,
      'deleteForEveryone': deleteForEveryone,
    });
  }

  // Typing indicator
  void setTyping(int conversationId, bool isTyping) {
    _socket?.emit('typing', {
      'conversationId': conversationId,
      'isTyping': isTyping,
    });
  }

  // Reactions
  void addReaction(int messageId, String emoji, int conversationId) {
    _socket?.emit('addReaction', {
      'messageId': messageId,
      'emoji': emoji,
      'conversationId': conversationId,
    });
  }

  // Read receipts
  void markAsRead(int messageId, int conversationId) {
    _socket?.emit('markAsRead', {
      'messageId': messageId,
      'conversationId': conversationId,
    });
  }

  // Presence
  void updatePresence(bool isOnline) {
    _socket?.emit('updatePresence', {'isOnline': isOnline});
  }

  // Event listeners
  void onNewMessage(Function(Message) callback) {
    _socket?.on('newMessage', (data) {
      callback(Message.fromJson(data));
    });
  }

  void onMessageUpdated(Function(Message) callback) {
    _socket?.on('messageUpdated', (data) {
      callback(Message.fromJson(data));
    });
  }

  void onMessageDeleted(Function(Map<String, dynamic>) callback) {
    _socket?.on('messageDeleted', (data) {
      callback(data);
    });
  }

  void onTyping(Function(Map<String, dynamic>) callback) {
    _socket?.on('typing', (data) {
      callback(data);
    });
  }

  void onReactionAdded(Function(Map<String, dynamic>) callback) {
    _socket?.on('reactionAdded', (data) {
      callback(data);
    });
  }

  void onReactionRemoved(Function(Map<String, dynamic>) callback) {
    _socket?.on('reactionRemoved', (data) {
      callback(data);
    });
  }

  void onMessageRead(Function(Map<String, dynamic>) callback) {
    _socket?.on('messageRead', (data) {
      callback(data);
    });
  }

  void onPresenceUpdate(Function(Map<String, dynamic>) callback) {
    _socket?.on('presenceUpdate', (data) {
      callback(data);
    });
  }

  void onMention(Function(Map<String, dynamic>) callback) {
    _socket?.on('mention', (data) {
      callback(data);
    });
  }

  void onError(Function(String) callback) {
    _socket?.on('error', (data) {
      callback(data['message'] ?? 'An error occurred');
    });
  }

  void onConnect(Function() callback) {
    _socket?.on('connect', (_) => callback());
  }

  void onDisconnect(Function() callback) {
    _socket?.on('disconnect', (_) => callback());
  }

  // Remove listeners
  void removeListener(String event) {
    _socket?.off(event);
  }

  bool get isConnected => _socket?.connected ?? false;
}

