import { Router } from 'express';
import { z } from 'zod';
import { Milestone } from '../models/Milestone.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCouple } from '../middleware/couple.js';

export const milestoneRouter = Router();

milestoneRouter.use(requireAuth, requireCouple);

milestoneRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const milestones = await Milestone.find({ couple: req.coupleId }).sort({ date: 1 });
    res.json({ milestones });
  }),
);

const createSchema = z.object({
  title: z.string().min(1).max(120),
  date: z.coerce.date(),
  icon: z.string().min(1).max(8).optional(),
});

milestoneRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, date, icon } = createSchema.parse(req.body);
    const milestone = await Milestone.create({ couple: req.coupleId, title, date, icon });
    res.status(201).json({ milestone });
  }),
);

// Custom баяр устгах (зөвхөн өөрийн хосын).
milestoneRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const deleted = await Milestone.findOneAndDelete({ _id: req.params.id, couple: req.coupleId });
    if (!deleted) {
      res.status(404).json({ error: 'Баяр олдсонгүй' });
      return;
    }
    res.json({ ok: true });
  }),
);
