import { Request, Response } from "express";
import prisma from "../config/db";

// GET all conversations for the authenticated user
export const getConversations = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    // Get private conversations
    const privateConversations = await prisma.conversation.findMany({
      where: {
        type: "private",
        OR: [{ participantOne: userId }, { participantTwo: userId }],
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { content: true, createdAt: true, senderId: true, type: true },
        },
        participantOneUser: { select: { id: true, username: true, avatar: true, isOnline: true } },
        participantTwoUser: { select: { id: true, username: true, avatar: true, isOnline: true } },
      },
    });

    // Get group conversations
    const groupConversations = await prisma.conversation.findMany({
      where: {
        type: "group",
        groupMembers: {
          some: { userId },
        },
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { content: true, createdAt: true, senderId: true, type: true },
        },
        groupMembers: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
      },
    });

    // Format private conversations
    const formattedPrivate = privateConversations.map((c) => ({
      conversation_id: c.id,
      type: "private",
      participant: {
        id: c.participantOne === userId ? c.participantTwoUser!.id : c.participantOneUser!.id,
        username:
          c.participantOne === userId ? c.participantTwoUser!.username : c.participantOneUser!.username,
        avatar: c.participantOne === userId ? c.participantTwoUser!.avatar : c.participantOneUser!.avatar,
        isOnline: c.participantOne === userId ? c.participantTwoUser!.isOnline : c.participantOneUser!.isOnline,
      },
      last_message: c.messages[0]?.content ?? null,
      last_message_time: c.messages[0]?.createdAt ?? null,
      last_message_sender_id: c.messages[0]?.senderId ?? null,
      last_message_type: c.messages[0]?.type ?? "text",
    }));

    // Format group conversations
    const formattedGroup = groupConversations.map((c) => ({
      conversation_id: c.id,
      type: "group",
      name: c.name,
      avatar: c.avatar,
      members: c.groupMembers.map((m) => ({
        id: m.user.id,
        username: m.user.username,
        avatar: m.user.avatar,
        role: m.role,
      })),
      last_message: c.messages[0]?.content ?? null,
      last_message_time: c.messages[0]?.createdAt ?? null,
      last_message_sender_id: c.messages[0]?.senderId ?? null,
      last_message_type: c.messages[0]?.type ?? "text",
    }));

    // Combine and sort by last message time
    const allConversations = [...formattedPrivate, ...formattedGroup].sort((a, b) => {
      const aTime = a.last_message_time?.getTime() ?? 0;
      const bTime = b.last_message_time?.getTime() ?? 0;
      return bTime - aTime;
    });

    res.json(allConversations);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST: Check for an existing conversation or create a new one (private)
export const checkOrCreateConversation = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { contactId } = req.body;

  if (!contactId || userId === contactId) {
    return res.status(400).json({ message: "Invalid contact ID" });
  }

  try {
    // Check if conversation already exists
    let conversation = await prisma.conversation.findFirst({
      where: {
        type: "private",
        OR: [
          { participantOne: userId, participantTwo: contactId },
          { participantOne: contactId, participantTwo: userId },
        ],
      },
    });

    // Create conversation if not found
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          type: "private",
          participantOne: userId,
          participantTwo: contactId,
        },
      });
    }

    res.json({ conversation_id: conversation.id });
  } catch (err) {
    console.error("Error creating/checking conversation:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST: Create a group conversation
export const createGroupConversation = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { name, avatar, memberIds } = req.body;

  if (!name || !memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ message: "Name and memberIds array are required" });
  }

  try {
    // Create group conversation with creator as admin
    const conversation = await prisma.conversation.create({
      data: {
        type: "group",
        name,
        avatar,
        groupMembers: {
          create: [
            { userId, role: "admin" }, // Creator is admin
            ...memberIds.map((memberId: number) => ({ userId: memberId, role: "member" })),
          ],
        },
      },
      include: {
        groupMembers: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
      },
    });

    res.json(conversation);
  } catch (err) {
    console.error("Error creating group conversation:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT: Update group conversation (name, avatar)
export const updateGroupConversation = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { conversationId } = req.params;
  const { name, avatar } = req.body;

  try {
    // Check if user is admin
    const member = await prisma.groupMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: Number(conversationId),
          userId,
        },
      },
    });

    if (!member || member.role !== "admin") {
      return res.status(403).json({ message: "Only admins can update group" });
    }

    const conversation = await prisma.conversation.update({
      where: { id: Number(conversationId) },
      data: { name, avatar },
      include: {
        groupMembers: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
      },
    });

    res.json(conversation);
  } catch (err) {
    console.error("Error updating group conversation:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST: Add members to group
export const addGroupMembers = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { conversationId } = req.params;
  const { memberIds } = req.body;

  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ message: "memberIds array is required" });
  }

  try {
    // Check if user is admin
    const member = await prisma.groupMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: Number(conversationId),
          userId,
        },
      },
    });

    if (!member || member.role !== "admin") {
      return res.status(403).json({ message: "Only admins can add members" });
    }

    // Add members
    await prisma.groupMember.createMany({
      data: memberIds.map((memberId: number) => ({
        conversationId: Number(conversationId),
        userId: memberId,
        role: "member",
      })),
      skipDuplicates: true,
    });

    const conversation = await prisma.conversation.findUnique({
      where: { id: Number(conversationId) },
      include: {
        groupMembers: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
      },
    });

    res.json(conversation);
  } catch (err) {
    console.error("Error adding group members:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE: Remove member from group
export const removeGroupMember = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { conversationId, memberId } = req.params;

  try {
    // Check if user is admin
    const adminMember = await prisma.groupMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: Number(conversationId),
          userId,
        },
      },
    });

    if (!adminMember || adminMember.role !== "admin") {
      return res.status(403).json({ message: "Only admins can remove members" });
    }

    // Cannot remove yourself if you're the only admin
    if (Number(memberId) === userId) {
      const adminCount = await prisma.groupMember.count({
        where: {
          conversationId: Number(conversationId),
          role: "admin",
        },
      });

      if (adminCount === 1) {
        return res.status(400).json({ message: "Cannot remove the only admin" });
      }
    }

    await prisma.groupMember.delete({
      where: {
        conversationId_userId: {
          conversationId: Number(conversationId),
          userId: Number(memberId),
        },
      },
    });

    res.json({ message: "Member removed successfully" });
  } catch (err) {
    console.error("Error removing group member:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT: Update member role (promote/demote)
export const updateMemberRole = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { conversationId, memberId } = req.params;
  const { role } = req.body;

  if (!role || !["admin", "member"].includes(role)) {
    return res.status(400).json({ message: "Valid role (admin/member) is required" });
  }

  try {
    // Check if user is admin
    const adminMember = await prisma.groupMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: Number(conversationId),
          userId,
        },
      },
    });

    if (!adminMember || adminMember.role !== "admin") {
      return res.status(403).json({ message: "Only admins can update roles" });
    }

    const updated = await prisma.groupMember.update({
      where: {
        conversationId_userId: {
          conversationId: Number(conversationId),
          userId: Number(memberId),
        },
      },
      data: { role },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Error updating member role:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT: Toggle mute/unmute notifications
export const toggleMute = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { conversationId } = req.params;

  try {
    const member = await prisma.groupMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: Number(conversationId),
          userId,
        },
      },
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    const updated = await prisma.groupMember.update({
      where: {
        conversationId_userId: {
          conversationId: Number(conversationId),
          userId,
        },
      },
      data: { muted: !member.muted },
    });

    res.json(updated);
  } catch (err) {
    console.error("Error toggling mute:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST: Leave group
export const leaveGroup = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { conversationId } = req.params;

  try {
    const member = await prisma.groupMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: Number(conversationId),
          userId,
        },
      },
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Check if leaving admin is the only admin
    if (member.role === "admin") {
      const adminCount = await prisma.groupMember.count({
        where: {
          conversationId: Number(conversationId),
          role: "admin",
        },
      });

      if (adminCount === 1) {
        return res.status(400).json({ message: "Cannot leave as the only admin" });
      }
    }

    await prisma.groupMember.delete({
      where: {
        conversationId_userId: {
          conversationId: Number(conversationId),
          userId,
        },
      },
    });

    res.json({ message: "Left group successfully" });
  } catch (err) {
    console.error("Error leaving group:", err);
    res.status(500).json({ message: "Server error" });
  }
};
