import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../models/message.dart';
import '../models/conversation.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:4000/api';
  // Change to your backend URL: 'http://YOUR_IP:4000/api' for mobile testing

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }

  static Future<Map<String, String>> _getHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // Auth
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['token']) {
      await saveToken(data['token']);
    }
    return data;
  }

  static Future<Map<String, dynamic>> register(
      String username, String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'email': email,
        'password': password,
      }),
    );

    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['token']) {
      await saveToken(data['token']);
    }
    return data;
  }

  // Conversations
  static Future<List<Conversation>> getConversations() async {
    final response = await http.get(
      Uri.parse('$baseUrl/conversations'),
      headers: await _getHeaders(),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Conversation.fromJson(json)).toList();
    }
    throw Exception('Failed to load conversations');
  }

  static Future<Map<String, dynamic>> createOrGetConversation(int contactId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/conversations'),
      headers: await _getHeaders(),
      body: jsonEncode({'contactId': contactId}),
    );

    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> createGroupConversation(
      String name, String? avatar, List<int> memberIds) async {
    final response = await http.post(
      Uri.parse('$baseUrl/conversations/group'),
      headers: await _getHeaders(),
      body: jsonEncode({
        'name': name,
        'avatar': avatar,
        'memberIds': memberIds,
      }),
    );

    return jsonDecode(response.body);
  }

  // Messages
  static Future<List<Message>> getMessages(int conversationId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/messages?conversationId=$conversationId'),
      headers: await _getHeaders(),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Message.fromJson(json)).toList();
    }
    throw Exception('Failed to load messages');
  }

  static Future<Message> sendMessage({
    required int conversationId,
    required String content,
    String type = "text",
    String? mediaUrl,
    String? fileName,
    int? fileSize,
    List<int>? mentions,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/messages'),
      headers: await _getHeaders(),
      body: jsonEncode({
        'conversationId': conversationId,
        'content': content,
        'type': type,
        'mediaUrl': mediaUrl,
        'fileName': fileName,
        'fileSize': fileSize,
        'mentions': mentions,
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return Message.fromJson(jsonDecode(response.body));
    }
    throw Exception('Failed to send message');
  }

  static Future<Message> editMessage(int messageId, String content) async {
    final response = await http.put(
      Uri.parse('$baseUrl/messages/$messageId'),
      headers: await _getHeaders(),
      body: jsonEncode({'content': content}),
    );

    if (response.statusCode == 200) {
      return Message.fromJson(jsonDecode(response.body));
    }
    throw Exception('Failed to edit message');
  }

  static Future<void> deleteMessage(int messageId, {bool deleteForEveryone = false}) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/messages/$messageId?deleteForEveryone=$deleteForEveryone'),
      headers: await _getHeaders(),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to delete message');
    }
  }

  static Future<void> addReaction(int messageId, String emoji) async {
    final response = await http.post(
      Uri.parse('$baseUrl/messages/reaction'),
      headers: await _getHeaders(),
      body: jsonEncode({'messageId': messageId, 'emoji': emoji}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to add reaction');
    }
  }

  static Future<void> markAsRead(int messageId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/messages/read'),
      headers: await _getHeaders(),
      body: jsonEncode({'messageId': messageId}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to mark as read');
    }
  }

  // Search
  static Future<List<Message>> searchMessages({
    int? conversationId,
    required String query,
    int? senderId,
  }) async {
    final queryParams = {
      'query': query,
      if (conversationId != null) 'conversationId': conversationId.toString(),
      if (senderId != null) 'senderId': senderId.toString(),
    };

    final uri = Uri.parse('$baseUrl/messages/search').replace(queryParameters: queryParams);
    final response = await http.get(uri, headers: await _getHeaders());

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Message.fromJson(json)).toList();
    }
    throw Exception('Failed to search messages');
  }

  // Contacts
  static Future<List<User>> getContacts() async {
    final response = await http.get(
      Uri.parse('$baseUrl/contacts'),
      headers: await _getHeaders(),
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => User.fromJson(json)).toList();
    }
    throw Exception('Failed to load contacts');
  }
}

