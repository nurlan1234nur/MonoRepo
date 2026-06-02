import { Router } from 'express';
import { z } from 'zod';
import { Mood } from '../models/Mood.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCouple } from '../middleware/couple.js';
import { emitToCouple } from '../realtime/socket.js';

export const moodRouter = Router();

moodRouter.use(requireAuth, requireCouple);

// Хосын хоёр гишүүний хамгийн сүүлийн mood.
moodRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const moods = await Mood.find({ couple: req.coupleId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('user', 'name avatar');
    res.json({ moods });
  }),
);

const setSchema = z.object({
  emoji: z.string().min(1),
  text: z.string().min(1),
});

moodRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { emoji, text } = setSchema.parse(req.body);
    const mood = await Mood.create({ couple: req.coupleId, user: req.userId, emoji, text });
    const populated = await mood.populate('user', 'name avatar');

    emitToCouple(req.coupleId!, 'mood:new', populated);

    res.status(201).json({ mood: populated });
  }),
);
