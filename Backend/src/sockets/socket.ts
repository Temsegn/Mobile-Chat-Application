// sockets/socket.ts
import { Server } from 'socket.io';
import http from 'http';
import prisma from '../config/db';

export let io: Server;

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join conversation room
    socket.on('joinConversation', ({ conversationId, userId }) => {
      socket.join(conversationId);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    // Send message
    socket.on('sendMessage', async ({ conversationId, content, senderId }) => {
      try {
        const newMessage = await prisma.message.create({
          data: { conversationId, content, senderId },
          include: { sender: { select: { id: true, username: true } } },
        });
        io.to(conversationId).emit('newMessage', newMessage);
      } catch (err) {
        console.error(err);
      }
    });

    // Edit message
    socket.on('editMessage', async ({ messageId, newContent, senderId, conversationId }) => {
      try {
        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message || message.senderId !== senderId) return;

        const updatedMessage = await prisma.message.update({
          where: { id: messageId },
          data: { content: newContent },
        });
        io.to(conversationId).emit('messageUpdated', updatedMessage);
      } catch (err) {
        console.error(err);
      }
    });

    // Delete message
    socket.on('deleteMessage', async ({ messageId, senderId, conversationId }) => {
      try {
        const message = await prisma.message.findUnique({ where: { id: messageId } });
        if (!message || message.senderId !== senderId) return;

        await prisma.message.delete({ where: { id: messageId } });
        io.to(conversationId).emit('messageDeleted', { messageId });
      } catch (err) {
        console.error(err);
      }
    });

    // Typing indicator
    socket.on('typing', ({ conversationId, userId, isTyping }) => {
      socket.to(conversationId).emit('typing', { userId, isTyping });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};
