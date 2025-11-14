import { Request, Response } from "express";
import prisma from "../config/db";

// GET all conversations for the authenticated user
export const getConversations = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ participantOne: userId }, { participantTwo: userId }],
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { content: true, createdAt: true, senderId: true },
        },
        participantOneUser: { select: { id: true, username: true } },
        participantTwoUser: { select: { id: true, username: true } },
      },
    });

    // Sort by latest message timestamp
    const sorted = conversations.sort((a, b) => {
      const aTime = a.messages[0]?.createdAt?.getTime() ?? 0;
      const bTime = b.messages[0]?.createdAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    const result = sorted.map((c) => ({
      conversation_id: c.id,
      participant: {
        id: c.participantOne === userId ? c.participantTwoUser.id : c.participantOneUser.id,
        username: c.participantOne === userId ? c.participantTwoUser.username : c.participantOneUser.username,
      },
      last_message: c.messages[0]?.content ?? null,
      last_message_time: c.messages[0]?.createdAt ?? null,
      last_message_sender_id: c.messages[0]?.senderId ?? null,
    }));

    res.json(result);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST: Check for an existing conversation or create a new one
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
        OR: [
          { participantOne: userId, participantTwo: contactId },
          { participantOne: contactId, participantTwo: userId },
        ],
      },
    });

    // Create conversation if not found
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { participantOne: userId, participantTwo: contactId },
      });
    }

    res.json({ conversation_id: conversation.id });
  } catch (err) {
    console.error("Error creating/checking conversation:", err);
    res.status(500).json({ message: "Server error" });
  }
};
