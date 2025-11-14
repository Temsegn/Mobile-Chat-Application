import express from "express";
import { getContacts, addContact } from "../controllers/contactControllers";
import { authMiddleware } from "../middlewares/auth"; // assuming you have JWT/auth middleware

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET all contacts for the authenticated user
router.get("/", getContacts);

// POST add a new contact for the authenticated user
router.post("/", addContact);

export default router;
