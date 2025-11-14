import { Request, Response } from "express";
import prisma from "../config/db";

// GET messages for a conversation
export const getMessages = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { conversationId } = req.query as { conversationId?: string };

  if (!conversationId) {
    return res.status(400).json({ message: "ConversationId is required" });
  }

  try {
    // Check if user has access to this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: Number(conversationId) },
      include: {
        groupMembers: { where: { userId } },
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check access: private chat or group member
    const isPrivateChat =
      conversation.type === "private" &&
      (conversation.participantOne === userId || conversation.participantTwo === userId);
    const isGroupMember = conversation.type === "group" && conversation.groupMembers.length > 0;

    if (!isPrivateChat && !isGroupMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get messages with all relations
    const messages = await prisma.message.findMany({
      where: {
        conversationId: Number(conversationId),
        isDeleted: false,
      },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        reactions: {
          include: { user: { select: { id: true, username: true } } },
        },
        mentions: {
          include: { user: { select: { id: true, username: true } } },
        },
        readReceipts: {
          where: { userId },
          select: { readAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST: Send a message
export const sendMessage = async (req: Request, res: Response) => {
  const senderId = (req as any).userId;
  const { conversationId, content, type, mediaUrl, fileName, fileSize, mentions } = req.body;

  if (!conversationId || !content) {
    return res.status(400).json({ message: "ConversationId and content are required" });
  }

  try {
    // Verify access
    const conversation = await prisma.conversation.findUnique({
      where: { id: Number(conversationId) },
      include: {
        groupMembers: { where: { userId: senderId } },
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isPrivateChat =
      conversation.type === "private" &&
      (conversation.participantOne === senderId || conversation.participantTwo === senderId);
    const isGroupMember = conversation.type === "group" && conversation.groupMembers.length > 0;

    if (!isPrivateChat && !isGroupMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: Number(conversationId),
        senderId,
        content,
        type: type || "text",
        mediaUrl,
        fileName,
        fileSize,
        mentions: mentions
          ? {
              create: mentions.map((userId: number) => ({ userId })),
            }
          : undefined,
      },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        reactions: true,
        mentions: {
          include: { user: { select: { id: true, username: true } } },
        },
        readReceipts: true,
      },
    });

    res.json(message);
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT: Edit a message
export const editMessage = async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const userId = (req as any).userId;

  try {
    const message = await prisma.message.findUnique({
      where: { id: Number(messageId) },
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: "Cannot edit deleted message" });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: Number(messageId) },
      data: { content, isEdited: true },
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

    res.json(updatedMessage);
  } catch (err) {
    console.error("Error editing message:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE: Delete a message
export const deleteMessage = async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const userId = (req as any).userId;
  const { deleteForEveryone } = req.query;

  try {
    const message = await prisma.message.findUnique({
      where: { id: Number(messageId) },
    });

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (deleteForEveryone === "true") {
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

    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST: Add reaction to message
export const addReaction = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { messageId, emoji } = req.body;

  if (!messageId || !emoji) {
    return res.status(400).json({ message: "MessageId and emoji are required" });
  }

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
      // Remove reaction if it already exists (toggle)
      await prisma.messageReaction.delete({
        where: { id: existing.id },
      });
      return res.json({ action: "removed" });
    }

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

    res.json({ action: "added", reaction });
  } catch (err) {
    console.error("Error adding reaction:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST: Mark message as read
export const markAsRead = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { messageId } = req.body;

  if (!messageId) {
    return res.status(400).json({ message: "MessageId is required" });
  }

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

    res.json(receipt);
  } catch (err) {
    console.error("Error marking as read:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET: Search messages
export const searchMessages = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { conversationId, query, senderId } = req.query;

  if (!query) {
    return res.status(400).json({ message: "Search query is required" });
  }

  try {
    const where: any = {
      content: { contains: query as string, mode: "insensitive" },
      isDeleted: false,
    };

    if (conversationId) {
      // Verify access
      const conversation = await prisma.conversation.findUnique({
        where: { id: Number(conversationId) },
        include: {
          groupMembers: { where: { userId } },
        },
      });

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const isPrivateChat =
        conversation.type === "private" &&
        (conversation.participantOne === userId || conversation.participantTwo === userId);
      const isGroupMember = conversation.type === "group" && conversation.groupMembers.length > 0;

      if (!isPrivateChat && !isGroupMember) {
        return res.status(403).json({ message: "Access denied" });
      }

      where.conversationId = Number(conversationId);
    }

    if (senderId) {
      where.senderId = Number(senderId);
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        conversation: {
          select: { id: true, type: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json(messages);
  } catch (err) {
    console.error("Error searching messages:", err);
    res.status(500).json({ message: "Server error" });
  }
};
