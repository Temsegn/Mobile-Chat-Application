// middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = jwt.verify(token, "chatapp") as { userId: number };
    (req as any).userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
