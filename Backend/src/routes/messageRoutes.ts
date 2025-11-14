import express from "express";
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  markAsRead,
  searchMessages,
} from "../controllers/messageControllers";
import { authMiddleware } from "../middlewares/auth";

const router = express.Router();

router.get("/", authMiddleware, getMessages);
router.post("/", authMiddleware, sendMessage);
router.put("/:messageId", authMiddleware, editMessage);
router.delete("/:messageId", authMiddleware, deleteMessage);
router.post("/reaction", authMiddleware, addReaction);
router.post("/read", authMiddleware, markAsRead);
router.get("/search", authMiddleware, searchMessages);

export default router;
