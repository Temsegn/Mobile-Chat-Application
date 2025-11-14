# Chat Application

A comprehensive real-time chat application built with Flutter (Riverpod) frontend and TypeScript/Express backend.

## Features

### 1-on-1 (Private) Chat
- ✅ Text messaging
- ✅ Typing indicators ("X is typing...")
- ✅ Read/delivered receipts (sent, delivered, read)
- ✅ Message history (persisted / archived)

### Group Chat
- ✅ Multiple participants in one conversation
- ✅ Admin roles (add/remove members)
- ✅ Group naming / group avatar
- ✅ Mute / unmute notifications for group members

### Message Features
- ✅ Reactions (emoji reactions to messages)
- ✅ Ability to remove your reaction
- ✅ Tracking count of reactions per message
- ✅ Edit your own messages (with "edited" tag)
- ✅ Delete your own messages
- ✅ "Delete for everyone" option

### Media Sharing
- ✅ Send images, videos, audio, files/documents
- ✅ Preview of media (thumbnails, in-chat display)

### Mentions / Tagging
- ✅ Tagging users in group chats with "@" mentions

### Search
- ✅ Search within chats (by message content, by sender)

### Offline Support
- ✅ Messages are stored when a user is offline, then delivered when they reconnect
- ✅ Syncing message edits and deletions when the user is back online

### Push Notifications
- ✅ Notify users of new messages, @mentions, when someone reacts

### Real-Time Presence & Status
- ✅ Presence / Online Status (show whether users are online, offline, or last seen)
- ✅ Typing indicators
- ✅ Read receipts

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.io
- **Authentication**: JWT

### Frontend
- **Framework**: Flutter
- **State Management**: Riverpod
- **Real-time**: Socket.io Client
- **HTTP Client**: http package
- **Storage**: SharedPreferences, Hive

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd Backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the `Backend` directory:
```
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=4000
```

4. Run Prisma migrations:
```bash
npx prisma migrate dev
```

5. Generate Prisma client:
```bash
npx prisma generate
```

6. Start the development server:
```bash
npm run dev
```

The backend will run on `http://localhost:4000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
flutter pub get
```

3. Update API and Socket URLs:
Edit `lib/services/api_service.dart` and `lib/services/socket_service.dart`:
- Change `localhost` to your backend IP address for mobile testing
- Or keep `localhost` for web/emulator testing

4. Run the app:
```bash
flutter run
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Conversations
- `GET /api/conversations` - Get all conversations
- `POST /api/conversations` - Create or get private conversation
- `POST /api/conversations/group` - Create group conversation
- `PUT /api/conversations/group/:conversationId` - Update group (name, avatar)
- `POST /api/conversations/group/:conversationId/members` - Add members
- `DELETE /api/conversations/group/:conversationId/members/:memberId` - Remove member
- `PUT /api/conversations/group/:conversationId/members/:memberId/role` - Update member role
- `PUT /api/conversations/group/:conversationId/mute` - Toggle mute
- `POST /api/conversations/group/:conversationId/leave` - Leave group

### Messages
- `GET /api/messages?conversationId=:id` - Get messages
- `POST /api/messages` - Send message
- `PUT /api/messages/:messageId` - Edit message
- `DELETE /api/messages/:messageId` - Delete message
- `POST /api/messages/reaction` - Add reaction
- `POST /api/messages/read` - Mark as read
- `GET /api/messages/search?query=:query` - Search messages

## Socket.io Events

### Client to Server
- `joinConversation` - Join a conversation room
- `leaveConversation` - Leave a conversation room
- `sendMessage` - Send a message
- `editMessage` - Edit a message
- `deleteMessage` - Delete a message
- `typing` - Typing indicator
- `addReaction` - Add reaction to message
- `markAsRead` - Mark message as read
- `updatePresence` - Update online status

### Server to Client
- `newMessage` - New message received
- `messageUpdated` - Message was edited
- `messageDeleted` - Message was deleted
- `typing` - User is typing
- `reactionAdded` - Reaction added
- `reactionRemoved` - Reaction removed
- `messageRead` - Message was read
- `presenceUpdate` - User presence changed
- `mention` - User was mentioned

## Database Schema

The application uses Prisma with PostgreSQL. Key models:
- `User` - User accounts with presence status
- `Conversation` - Both private and group conversations
- `GroupMember` - Group membership with roles
- `Message` - Messages with media support
- `MessageReaction` - Emoji reactions
- `MessageMention` - User mentions
- `ReadReceipt` - Read receipts
- `Contact` - User contacts

## Development Notes

- The backend uses Socket.io for real-time communication
- Authentication is handled via JWT tokens
- Messages support multiple types: text, image, video, audio, file
- Group chats support admin roles and member management
- Presence status is tracked and updated in real-time
- Read receipts track when messages are read
- Reactions support multiple emojis per message

## Future Enhancements

- Push notifications setup (Firebase/APNs)
- File upload service (AWS S3, Cloudinary, etc.)
- End-to-end encryption
- Voice/video calls
- Message forwarding
- Message pinning
- Custom emoji support

## License

MIT

