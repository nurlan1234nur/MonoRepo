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
      .populate('author', 'name avatar');
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

    const approvalIndex = wish.completionApprovals.findIndex(
      (userId) => userId.toString() === req.userId,
    );
    if (approvalIndex >= 0) wish.completionApprovals.splice(approvalIndex, 1);
    else wish.completionApprovals.push(req.userId as never);

    const wasCompleted = wish.completed;
    wish.completed = wish.completionApprovals.length >= 2;
    if (wish.completed && !wasCompleted) wish.completedAt = new Date();
    if (!wish.completed) wish.completedAt = null;
    await wish.save();
    const populated = await wish.populate('author', 'name avatar');
    emitToCouple(req.coupleId!, 'wish:update', populated);
    res.json({ wish: populated });
  }),
);

wishRouter.patch(
  '/:id/delete-approval',
  asyncHandler(async (req, res) => {
    const wish = await Wish.findOne({ _id: req.params.id, couple: req.coupleId });
    if (!wish) {
      res.status(404).json({ error: 'Хүсэл олдсонгүй' });
      return;
    }
    const approvalIndex = wish.deletionApprovals.findIndex(
      (userId) => userId.toString() === req.userId,
    );
    if (approvalIndex >= 0) wish.deletionApprovals.splice(approvalIndex, 1);
    else wish.deletionApprovals.push(req.userId as never);

    if (wish.deletionApprovals.length >= 2) {
      await wish.deleteOne();
      emitToCouple(req.coupleId!, 'wish:deleted', { id: req.params.id });
      res.json({ deleted: true, id: req.params.id });
      return;
    }

    await wish.save();
    const populated = await wish.populate('author', 'name avatar');
    emitToCouple(req.coupleId!, 'wish:update', populated);
    res.json({ deleted: false, wish: populated });
  }),
);
