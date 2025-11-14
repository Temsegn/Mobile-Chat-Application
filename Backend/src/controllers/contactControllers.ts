import { Request, Response } from "express";
import prisma from "../config/db";

// GET contacts for the authenticated user
export const getContacts = async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  try {
    const contacts = await prisma.contact.findMany({
      where: { userId },
      include: {
        contact: { select: { id: true, username: true } },
      },
    });

    // Map to a clean array
    const contactList = contacts.map(c => c.contact);

    res.json(contactList);
  } catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST add a new contact for the authenticated user
export const addContact = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { contactId } = req.body;

  if (!contactId || userId === contactId) {
    return res.status(400).json({ message: "Invalid contact ID" });
  }

  try {
    // Check if the contact exists
    const contact = await prisma.user.findUnique({ where: { id: contactId } });
    if (!contact) return res.status(404).json({ message: "Contact not found" });

    // Check if already added
    const existing = await prisma.contact.findUnique({
      where: { userId_contactId: { userId, contactId } },
    });
    if (existing) return res.status(400).json({ message: "Contact already added" });

    // Add contact
    await prisma.contact.create({
      data: { userId, contactId },
    });

    res.json({ message: "Contact added successfully" });
  } catch (err) {
    console.error("Error adding contact:", err);
    res.status(500).json({ message: "Server error" });
  }
};
