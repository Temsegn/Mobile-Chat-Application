import 'user.dart';
import 'message.dart';

class Conversation {
  final int conversationId;
  final String type; // "private" or "group"
  final User? participant; // For private chats
  final String? name; // For group chats
  final String? avatar; // For group chats
  final String? lastMessage;
  final DateTime? lastMessageTime;
  final int? lastMessageSenderId;
  final String? lastMessageType;
  final List<GroupMember>? members; // For group chats

  Conversation({
    required this.conversationId,
    required this.type,
    this.participant,
    this.name,
    this.avatar,
    this.lastMessage,
    this.lastMessageTime,
    this.lastMessageSenderId,
    this.lastMessageType,
    this.members,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      conversationId: json['conversation_id'],
      type: json['type'] ?? "private",
      participant: json['participant'] != null ? User.fromJson(json['participant']) : null,
      name: json['name'],
      avatar: json['avatar'],
      lastMessage: json['last_message'],
      lastMessageTime: json['last_message_time'] != null
          ? DateTime.parse(json['last_message_time'])
          : null,
      lastMessageSenderId: json['last_message_sender_id'],
      lastMessageType: json['last_message_type'] ?? "text",
      members: json['members'] != null
          ? (json['members'] as List<dynamic>)
              .map((m) => GroupMember.fromJson(m))
              .toList()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'conversation_id': conversationId,
      'type': type,
      'participant': participant?.toJson(),
      'name': name,
      'avatar': avatar,
      'last_message': lastMessage,
      'last_message_time': lastMessageTime?.toIso8601String(),
      'last_message_sender_id': lastMessageSenderId,
      'last_message_type': lastMessageType,
      'members': members?.map((m) => m.toJson()).toList(),
    };
  }
}

class GroupMember {
  final int id;
  final String username;
  final String? avatar;
  final String role; // "admin" or "member"
  final bool muted;

  GroupMember({
    required this.id,
    required this.username,
    this.avatar,
    this.role = "member",
    this.muted = false,
  });

  factory GroupMember.fromJson(Map<String, dynamic> json) {
    return GroupMember(
      id: json['id'],
      username: json['username'],
      avatar: json['avatar'],
      role: json['role'] ?? "member",
      muted: json['muted'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'avatar': avatar,
      'role': role,
      'muted': muted,
    };
  }
}

