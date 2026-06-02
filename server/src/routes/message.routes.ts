import { Router } from 'express';
import { z } from 'zod';
import { Message } from '../models/Message.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCouple } from '../middleware/couple.js';
import { emitToCouple } from '../realtime/socket.js';

export const messageRouter = Router();

messageRouter.use(requireAuth, requireCouple);

// Сүүлийн зурвасууд (хуучнаас шинэ рүү).
messageRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const messages = await Message.find({ couple: req.coupleId })
      .sort({ createdAt: 1 })
      .limit(200)
      .populate('sender', 'name avatar');
    res.json({ messages });
  }),
);

const sendSchema = z.object({
  text: z.string().min(1).max(4000),
  special: z.boolean().optional(),
});

messageRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { text, special } = sendSchema.parse(req.body);
    const message = await Message.create({
      couple: req.coupleId,
      sender: req.userId,
      text,
      special: special ?? false,
    });
    const populated = await message.populate('sender', 'name avatar');

    // Хосын нөгөө гишүүнд real-time дамжуулна.
    emitToCouple(req.coupleId!, 'message:new', populated);

    res.status(201).json({ message: populated });
  }),
);
