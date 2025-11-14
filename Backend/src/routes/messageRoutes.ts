import express from "express";
import { getMessages } from "../controllers/messageControllers";
import { authMiddleware } from "../middlewares/auth";

const router = express.Router();

router.get("/", authMiddleware, getMessages);

// router.post("/", authMiddleware, sendMessage);
// router.put("/:messageId",authMiddleware,editMessage)
// router.delete("/:messageId",authMiddleware,deleteMessage)

export default router;
