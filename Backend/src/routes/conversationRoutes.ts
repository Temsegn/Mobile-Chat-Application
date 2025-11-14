// routes/conversationRoutes.ts
import { Router } from "express";
import { getConversations } from "../controllers/conversationControllers";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

router.get("/", authMiddleware, getConversations);

export default router;
