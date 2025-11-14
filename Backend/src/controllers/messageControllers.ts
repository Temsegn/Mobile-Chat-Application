import { Request, Response } from "express";
import prisma from "../config/db";

// GET messages between two users
export const getMessages = async (req: Request, res: Response) => {
  const senderId = (req as any).userId;
  const { receiverId } = req.query as { receiverId?: string };

  if (!receiverId) {
    return res.status(400).json({ message: "ReceiverId is required" });
  }

  try {
    // Find or create conversation
    const conversation = await findOrCreateConversation(senderId, Number(receiverId));

    // Guard against null/undefined conversation so TypeScript knows it's present
    if (!conversation) {
      return res.status(500).json({ message: "Conversation not found" });
    }

    // Map messages to include receiver info
    const messagesWithReceiver = conversation.messages.map((msg) => {
      const receiver =
        msg.senderId === conversation.participantOne
          ? conversation.participantTwoUser
          : conversation.participantOneUser;

      return {
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        sender: msg.sender,
        receiver: { id: receiver.id, username: receiver.username },
      };
    });

    res.json(messagesWithReceiver);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper function to find or create a conversation
const findOrCreateConversation = async (userId: number, contactId: number) => {
  let conversation = await prisma.conversation.findFirst({
    where: {
      OR: [
        { participantOne: userId, participantTwo: contactId },
        { participantOne: contactId, participantTwo: userId },
      ],
    },
    include: {
      participantOneUser: { select: { id: true, username: true } },
      participantTwoUser: { select: { id: true, username: true } },
      messages: {
        include: { sender: { select: { id: true, username: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
  conversation = await prisma.conversation.create({
    data: { participantOne: userId, participantTwo: contactId },
    include: {
      participantOneUser: { select: { id: true, username: true } },
      participantTwoUser: { select: { id: true, username: true } },
      messages: {
        include: { sender: { select: { id: true, username: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}


  return conversation;
};


// // POST send message between two users
// export const sendMessage = async (req: Request, res: Response) => {
//   const senderId = (req as any).userId;
//   const { receiverId, content } = req.body;

//   if (!receiverId || !content) {
//     return res.status(400).json({ message: "ReceiverId and content are required" });
//   }

//   try {
//     // Find existing conversation or create if first message
//     let conversation = await prisma.conversation.findFirst({
//       where: {
//         OR: [
//           { participantOne: senderId, participantTwo: Number(receiverId) },
//           { participantOne: Number(receiverId), participantTwo: senderId },
//         ],
//       },
//     });

//     if (!conversation) {
//       conversation = await prisma.conversation.create({
//         data: { participantOne: senderId, participantTwo: Number(receiverId) },
//       });
//     }

//     // Create the message
//     const message = await prisma.message.create({
//       data: {
//         conversationId: conversation.id,
//         content,
//         senderId,
//       },
//       include: { sender: { select: { id: true, username: true } } },
//     });

//     // Include receiver info
//     const receiver =
//       senderId === conversation.participantOne
//         ? await prisma.user.findUnique({ where: { id: conversation.participantTwo } })
//         : await prisma.user.findUnique({ where: { id: conversation.participantOne } });

//     res.json({
//       ...message,
//       receiver: { id: receiver?.id, username: receiver?.username },
//       conversationId: conversation.id,
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const deleteMessage = async (req: Request, res: Response) => {
//   const { messageId } = req.params;
//   const userId = (req as any).userId;

//   try {
//     const message = await prisma.message.findUnique({
//       where: { id: Number(messageId) },
//     });

//     if (!message) {
//       return res.status(404).json({ message: "Message not found" });
//     }

//     if (message.senderId !== userId) {
//       return res.status(403).json({ message: "Unauthorized" });
//     }

//     await prisma.message.delete({
//       where: { id: Number(messageId) },
//     });

//     res.json({ message: "Message deleted successfully" });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };
// export const editMessage = async (req: Request, res: Response) => {     
//     const { messageId } = req.params;   
//     const { content } = req.body;
//     const userId = (req as any).userId;
//     try {
//       const message = await prisma.message.findUnique({
//         where: { id: Number(messageId) },
//       });
//         if (!message) {
//           return res.status(404).json({ message: "Message not found" });
//         }

//         if (message.senderId !== userId) {
//           return res.status(403).json({ message: "Unauthorized" });
//         }
        
//         const updatedMessage = await prisma.message.update({
//           where: { id: Number(messageId) },
//           data: { content },
//         });

//         res.json(updatedMessage);
//       } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: "Server error" });
//       }
//     };
     