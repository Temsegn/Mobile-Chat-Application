import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/authRoutes';
import conversationRoutes from './routes/conversationRoutes';
import messageRoutes from './routes/messageRoutes';
import contactRoute from './routes/contactRoutes';
import { initSocket } from './sockets/socket'; // Import socket initializer

dotenv.config();

const PORT = process.env.PORT || 4000;

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      message: 'Server and database are running smoothly 🚀',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed ❌',
      error: String(error),
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/contacts', contactRoute);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});

export default app;
