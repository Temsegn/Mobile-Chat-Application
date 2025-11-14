// sockets/socket.ts
import { Server, Socket } from "socket.io";
import http from "http";
import prisma from "../config/db";
import jwt from "jsonwebtoken";

export let io: Server;

interface AuthenticatedSocket extends Socket {
  userId?: number;
}

// Authenticate socket connection
const authenticateSocket = (socket: AuthenticatedSocket, next: any) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }

  try {
    const payload = jwt.verify(token, "chatapp") as { userId: number };
    socket.userId = payload.userId;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
};

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // Authentication middleware
  io.use(authenticateSocket);

  io.on("connection", (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log("Client connected:", socket.id, "User:", userId);

    // Update user online status
    prisma.user.update({
      where: { id: userId },
      data: { isOnline: true, lastSeen: new Date() },
    });

    // Join user's personal room for presence updates
    socket.join(`user:${userId}`);

    // Join conversation room
    socket.on("joinConversation", async ({ conversationId }) => {
      try {
        // Verify user has access to conversation
        const conversation = await prisma.conversation.findUnique({
          where: { id: Number(conversationId) },
          include: {
            groupMembers: { where: { userId } },
          },
        });

        if (!conversation) {
          return socket.emit("error", { message: "Conversation not found" });
        }

        const isPrivateChat =
          conversation.type === "private" &&
          (conversation.participantOne === userId || conversation.participantTwo === userId);
        const isGroupMember = conversation.type === "group" && conversation.groupMembers.length > 0;

        if (!isPrivateChat && !isGroupMember) {
          return socket.emit("error", { message: "Access denied" });
        }

        socket.join(`conversation:${conversationId}`);
        console.log(`User ${userId} joined conversation ${conversationId}`);

        // Notify others in conversation
        socket.to(`conversation:${conversationId}`).emit("userJoined", { userId, conversationId });
      } catch (err) {
        console.error("Error joining conversation:", err);
        socket.emit("error", { message: "Failed to join conversation" });
      }
    });

    // Leave conversation room
    socket.on("leaveConversation", ({ conversationId }) => {
      socket.leave(`conversation:${conversationId}`);
      socket.to(`conversation:${conversationId}`).emit("userLeft", { userId, conversationId });
    });

    // Send message
    socket.on("sendMessage", async ({ conversationId, content, type, mediaUrl, fileName, fileSize, mentions }) => {
      try {
        // Verify access
        const conversation = await prisma.conversation.findUnique({
          where: { id: Number(conversationId) },
          include: {
            groupMembers: { where: { userId } },
          },
        });

        if (!conversation) {
          return socket.emit("error", { message: "Conversation not found" });
        }

        const isPrivateChat =
          conversation.type === "private" &&
          (conversation.participantOne === userId || conversation.participantTwo === userId);
        const isGroupMember = conversation.type === "group" && conversation.groupMembers.length > 0;

        if (!isPrivateChat && !isGroupMember) {
          return socket.emit("error", { message: "Access denied" });
        }

        // Create message
        const newMessage = await prisma.message.create({
          data: {
            conversationId: Number(conversationId),
            senderId: userId,
            content,
            type: type || "text",
            mediaUrl,
            fileName,
            fileSize,
            mentions: mentions
              ? {
                  create: mentions.map((mentionUserId: number) => ({ userId: mentionUserId })),
                }
              : undefined,
          },
          include: {
            sender: { select: { id: true, username: true, avatar: true } },
            reactions: true,
            mentions: {
              include: { user: { select: { id: true, username: true } } },
            },
          },
        });

        // Emit to all in conversation
        io.to(`conversation:${conversationId}`).emit("newMessage", newMessage);

        // Notify mentioned users if any
        if (mentions && mentions.length > 0) {
          mentions.forEach((mentionUserId: number) => {
            io.to(`user:${mentionUserId}`).emit("mention", {
              message: newMessage,
              conversationId,
            });
          });
        }
      } catch (err) {
        console.error("Error sending message:", err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Edit message
    socket.on("editMessage", async ({ messageId, newContent, conversationId }) => {
      try {
        const message = await prisma.message.findUnique({ where: { id: Number(messageId) } });
        if (!message || message.senderId !== userId) {
          return socket.emit("error", { message: "Unauthorized" });
        }

        if (message.isDeleted) {
          return socket.emit("error", { message: "Cannot edit deleted message" });
        }

        const updatedMessage = await prisma.message.update({
          where: { id: Number(messageId) },
          data: { content: newContent, isEdited: true },
          include: {
            sender: { select: { id: true, username: true, avatar: true } },
            reactions: {
              include: { user: { select: { id: true, username: true } } },
            },
            mentions: {
              include: { user: { select: { id: true, username: true } } },
            },
          },
        });

        io.to(`conversation:${conversationId}`).emit("messageUpdated", updatedMessage);
      } catch (err) {
        console.error("Error editing message:", err);
        socket.emit("error", { message: "Failed to edit message" });
      }
    });

    // Delete message
    socket.on("deleteMessage", async ({ messageId, conversationId, deleteForEveryone }) => {
      try {
        const message = await prisma.message.findUnique({ where: { id: Number(messageId) } });
        if (!message || message.senderId !== userId) {
          return socket.emit("error", { message: "Unauthorized" });
        }

        if (deleteForEveryone) {
          await prisma.message.update({
            where: { id: Number(messageId) },
            data: { isDeleted: true, deletedForEveryone: true },
          });
        } else {
          await prisma.message.update({
            where: { id: Number(messageId) },
            data: { isDeleted: true },
          });
        }

        io.to(`conversation:${conversationId}`).emit("messageDeleted", {
          messageId: Number(messageId),
          deleteForEveryone,
        });
      } catch (err) {
        console.error("Error deleting message:", err);
        socket.emit("error", { message: "Failed to delete message" });
      }
    });

    // Typing indicator
    socket.on("typing", ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit("typing", {
        userId,
        isTyping,
        conversationId,
      });
    });

    // Add reaction
    socket.on("addReaction", async ({ messageId, emoji, conversationId }) => {
      try {
        // Check if reaction already exists
        const existing = await prisma.messageReaction.findUnique({
          where: {
            messageId_userId_emoji: {
              messageId: Number(messageId),
              userId,
              emoji,
            },
          },
        });

        if (existing) {
          // Remove reaction (toggle)
          await prisma.messageReaction.delete({
            where: { id: existing.id },
          });
          io.to(`conversation:${conversationId}`).emit("reactionRemoved", {
            messageId: Number(messageId),
            userId,
            emoji,
          });
        } else {
          // Add reaction
          const reaction = await prisma.messageReaction.create({
            data: {
              messageId: Number(messageId),
              userId,
              emoji,
            },
            include: {
              user: { select: { id: true, username: true } },
            },
          });
          io.to(`conversation:${conversationId}`).emit("reactionAdded", reaction);
        }
      } catch (err) {
        console.error("Error adding reaction:", err);
        socket.emit("error", { message: "Failed to add reaction" });
      }
    });

    // Mark message as read
    socket.on("markAsRead", async ({ messageId, conversationId }) => {
      try {
        const receipt = await prisma.readReceipt.upsert({
          where: {
            messageId_userId: {
              messageId: Number(messageId),
              userId,
            },
          },
          update: { readAt: new Date() },
          create: {
            messageId: Number(messageId),
            userId,
          },
        });

        // Notify others in conversation
        io.to(`conversation:${conversationId}`).emit("messageRead", {
          messageId: Number(messageId),
          userId,
          readAt: receipt.readAt,
        });
      } catch (err) {
        console.error("Error marking as read:", err);
      }
    });

    // Update presence
    socket.on("updatePresence", async ({ isOnline }) => {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isOnline,
          lastSeen: isOnline ? new Date() : new Date(),
        },
      });

      // Notify contacts
      const contacts = await prisma.contact.findMany({
        where: {
          OR: [{ userId }, { contactId: userId }],
        },
      });

      contacts.forEach((contact) => {
        const otherUserId = contact.userId === userId ? contact.contactId : contact.userId;
        io.to(`user:${otherUserId}`).emit("presenceUpdate", {
          userId,
          isOnline,
          lastSeen: new Date(),
        });
      });
    });

    // Disconnect
    socket.on("disconnect", async () => {
      console.log("Client disconnected:", socket.id);
      // Update user offline status
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() },
      });

      // Notify contacts
      const contacts = await prisma.contact.findMany({
        where: {
          OR: [{ userId }, { contactId: userId }],
        },
      });

      contacts.forEach((contact) => {
        const otherUserId = contact.userId === userId ? contact.contactId : contact.userId;
        io.to(`user:${otherUserId}`).emit("presenceUpdate", {
          userId,
          isOnline: false,
          lastSeen: new Date(),
        });
      });
    });
  });
};
