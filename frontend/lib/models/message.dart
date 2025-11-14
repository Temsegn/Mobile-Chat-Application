import 'user.dart';

class Message {
  final int id;
  final int conversationId;
  final int senderId;
  final String content;
  final String type; // "text", "image", "video", "audio", "file"
  final String? mediaUrl;
  final String? fileName;
  final int? fileSize;
  final bool isEdited;
  final bool isDeleted;
  final bool deletedForEveryone;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final User sender;
  final List<MessageReaction> reactions;
  final List<MessageMention> mentions;
  final ReadReceipt? readReceipt;

  Message({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.content,
    this.type = "text",
    this.mediaUrl,
    this.fileName,
    this.fileSize,
    this.isEdited = false,
    this.isDeleted = false,
    this.deletedForEveryone = false,
    required this.createdAt,
    this.updatedAt,
    required this.sender,
    this.reactions = const [],
    this.mentions = const [],
    this.readReceipt,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'],
      conversationId: json['conversationId'],
      senderId: json['senderId'],
      content: json['content'],
      type: json['type'] ?? "text",
      mediaUrl: json['mediaUrl'],
      fileName: json['fileName'],
      fileSize: json['fileSize'],
      isEdited: json['isEdited'] ?? false,
      isDeleted: json['isDeleted'] ?? false,
      deletedForEveryone: json['deletedForEveryone'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : null,
      sender: User.fromJson(json['sender']),
      reactions: (json['reactions'] as List<dynamic>?)
              ?.map((r) => MessageReaction.fromJson(r))
              .toList() ??
          [],
      mentions: (json['mentions'] as List<dynamic>?)
              ?.map((m) => MessageMention.fromJson(m))
              .toList() ??
          [],
      readReceipt: json['readReceipts'] != null && (json['readReceipts'] as List).isNotEmpty
          ? ReadReceipt.fromJson(json['readReceipts'][0])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'conversationId': conversationId,
      'senderId': senderId,
      'content': content,
      'type': type,
      'mediaUrl': mediaUrl,
      'fileName': fileName,
      'fileSize': fileSize,
      'isEdited': isEdited,
      'isDeleted': isDeleted,
      'deletedForEveryone': deletedForEveryone,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
      'sender': sender.toJson(),
      'reactions': reactions.map((r) => r.toJson()).toList(),
      'mentions': mentions.map((m) => m.toJson()).toList(),
    };
  }
}

class MessageReaction {
  final int id;
  final int messageId;
  final int userId;
  final String emoji;
  final DateTime createdAt;
  final User? user;

  MessageReaction({
    required this.id,
    required this.messageId,
    required this.userId,
    required this.emoji,
    required this.createdAt,
    this.user,
  });

  factory MessageReaction.fromJson(Map<String, dynamic> json) {
    return MessageReaction(
      id: json['id'],
      messageId: json['messageId'],
      userId: json['userId'],
      emoji: json['emoji'],
      createdAt: DateTime.parse(json['createdAt']),
      user: json['user'] != null ? User.fromJson(json['user']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'messageId': messageId,
      'userId': userId,
      'emoji': emoji,
      'createdAt': createdAt.toIso8601String(),
      'user': user?.toJson(),
    };
  }
}

class MessageMention {
  final int id;
  final int messageId;
  final int userId;
  final DateTime createdAt;
  final User? user;

  MessageMention({
    required this.id,
    required this.messageId,
    required this.userId,
    required this.createdAt,
    this.user,
  });

  factory MessageMention.fromJson(Map<String, dynamic> json) {
    return MessageMention(
      id: json['id'],
      messageId: json['messageId'],
      userId: json['userId'],
      createdAt: DateTime.parse(json['createdAt']),
      user: json['user'] != null ? User.fromJson(json['user']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'messageId': messageId,
      'userId': userId,
      'createdAt': createdAt.toIso8601String(),
      'user': user?.toJson(),
    };
  }
}

class ReadReceipt {
  final int id;
  final int messageId;
  final int userId;
  final DateTime readAt;

  ReadReceipt({
    required this.id,
    required this.messageId,
    required this.userId,
    required this.readAt,
  });

  factory ReadReceipt.fromJson(Map<String, dynamic> json) {
    return ReadReceipt(
      id: json['id'],
      messageId: json['messageId'],
      userId: json['userId'],
      readAt: DateTime.parse(json['readAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'messageId': messageId,
      'userId': userId,
      'readAt': readAt.toIso8601String(),
    };
  }
}

