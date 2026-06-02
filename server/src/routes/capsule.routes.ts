import { Router } from 'express';
import { z } from 'zod';
import { Capsule } from '../models/Capsule.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCouple } from '../middleware/couple.js';

export const capsuleRouter = Router();

capsuleRouter.use(requireAuth, requireCouple);

// Жагсаалт: текстийг зөвхөн unlockAt болсон бол буцаана (server-side хамгаалалт).
capsuleRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const capsules = await Capsule.find({ couple: req.coupleId })
      .sort({ unlockAt: 1 })
      .populate('author', 'name avatar');

    const safe = capsules.map((c) => {
      const unlocked = c.unlockAt <= now;
      return {
        id: c._id,
        author: c.author,
        unlockAt: c.unlockAt,
        createdAt: c.createdAt,
        unlocked,
        text: unlocked ? c.text : null, // түгжээтэй бол текст явуулахгүй
      };
    });

    res.json({ capsules: safe });
  }),
);

const createSchema = z.object({
  text: z.string().min(1).max(8000),
  unlockAt: z.coerce.date(),
});

capsuleRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { text, unlockAt } = createSchema.parse(req.body);
    if (unlockAt <= new Date()) {
      res.status(400).json({ error: 'Нээх огноо ирээдүйд байх ёстой' });
      return;
    }
    const capsule = await Capsule.create({
      couple: req.coupleId,
      author: req.userId,
      text,
      unlockAt,
    });
    res.status(201).json({
      capsule: { id: capsule._id, unlockAt: capsule.unlockAt, createdAt: capsule.createdAt, unlocked: false },
    });
  }),
);
