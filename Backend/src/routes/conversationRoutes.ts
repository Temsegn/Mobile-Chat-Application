// routes/conversationRoutes.ts
import { Router } from "express";
import {
  getConversations,
  checkOrCreateConversation,
  createGroupConversation,
  updateGroupConversation,
  addGroupMembers,
  removeGroupMember,
  updateMemberRole,
  toggleMute,
  leaveGroup,
} from "../controllers/conversationControllers";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

router.get("/", authMiddleware, getConversations);
router.post("/", authMiddleware, checkOrCreateConversation);
router.post("/group", authMiddleware, createGroupConversation);
router.put("/group/:conversationId", authMiddleware, updateGroupConversation);
router.post("/group/:conversationId/members", authMiddleware, addGroupMembers);
router.delete("/group/:conversationId/members/:memberId", authMiddleware, removeGroupMember);
router.put("/group/:conversationId/members/:memberId/role", authMiddleware, updateMemberRole);
router.put("/group/:conversationId/mute", authMiddleware, toggleMute);
router.post("/group/:conversationId/leave", authMiddleware, leaveGroup);

export default router;
