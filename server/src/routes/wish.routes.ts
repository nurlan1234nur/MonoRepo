import { Router } from 'express';
import { z } from 'zod';
import { Wish } from '../models/Wish.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCouple } from '../middleware/couple.js';
import { emitToCouple } from '../realtime/socket.js';

export const wishRouter = Router();

wishRouter.use(requireAuth, requireCouple);

wishRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const wishes = await Wish.find({ couple: req.coupleId })
      .sort({ completed: 1, createdAt: -1 })
      .populate('author', 'name avatar')
      .populate('completedBy', 'name avatar');
    res.json({ wishes });
  }),
);

const createSchema = z.object({ text: z.string().trim().min(1).max(500) });

wishRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { text } = createSchema.parse(req.body);
    const wish = await Wish.create({ couple: req.coupleId, author: req.userId, text });
    const populated = await wish.populate('author', 'name avatar');
    emitToCouple(req.coupleId!, 'wish:new', populated);
    res.status(201).json({ wish: populated });
  }),
);

wishRouter.patch(
  '/:id/toggle',
  asyncHandler(async (req, res) => {
    const wish = await Wish.findOne({ _id: req.params.id, couple: req.coupleId });
    if (!wish) {
      res.status(404).json({ error: 'Хүсэл олдсонгүй' });
      return;
    }

    wish.completed = !wish.completed;
    wish.completedAt = wish.completed ? new Date() : null;
    wish.completedBy = wish.completed ? (req.userId as never) : null;
    await wish.save();
    const populated = await wish.populate([
      { path: 'author', select: 'name avatar' },
      { path: 'completedBy', select: 'name avatar' },
    ]);
    emitToCouple(req.coupleId!, 'wish:update', populated);
    res.json({ wish: populated });
  }),
);

wishRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const wish = await Wish.findOne({ _id: req.params.id, couple: req.coupleId });
    if (!wish) {
      res.status(404).json({ error: 'Хүсэл олдсонгүй' });
      return;
    }
    if (wish.author.toString() !== req.userId) {
      res.status(403).json({ error: 'Зөвхөн өөрийн нэмсэн хүслийг устгана' });
      return;
    }

    await wish.deleteOne();
    emitToCouple(req.coupleId!, 'wish:deleted', { id: req.params.id });
    res.json({ ok: true });
  }),
);
