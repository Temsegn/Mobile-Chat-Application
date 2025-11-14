import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET ||'chatapp'; 

// -------------------- REGISTER --------------------
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword },
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, name: user.username, email: user.email },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// -------------------- LOGIN --------------------
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.username, email: user.email },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};
