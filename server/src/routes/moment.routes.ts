import { Router } from 'express';
import { z } from 'zod';
import { Moment } from '../models/Moment.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCouple } from '../middleware/couple.js';
import path from 'node:path';
import fs from 'node:fs';
import { upload, uploadsDir } from '../config/uploads.js';
import { emitToCouple } from '../realtime/socket.js';

export const momentRouter = Router();

momentRouter.use(requireAuth, requireCouple);

// Хосын бүх moment, шинэ → хуучин.
momentRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const moments = await Moment.find({ couple: req.coupleId })
      .sort({ createdAt: -1 })
      .populate('author', 'name avatar');
    res.json({ moments });
  }),
);

// Зураг + caption upload (multipart/form-data, талбар: image, caption).
momentRouter.post(
  '/',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'Зураг шаардлагатай' });
      return;
    }
    const caption = typeof req.body.caption === 'string' ? req.body.caption.slice(0, 500) : '';
    const moment = await Moment.create({
      couple: req.coupleId,
      author: req.userId,
      imageUrl: `/uploads/${req.file.filename}`,
      caption,
    });
    const populated = await moment.populate('author', 'name avatar');

    emitToCouple(req.coupleId!, 'moment:new', populated);

    res.status(201).json({ moment: populated });
  }),
);

// Дурсамж устгах — зөвхөн өөрийн оруулсныг. Зургийн файлыг нь ч устгана.
momentRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const moment = await Moment.findOne({ _id: req.params.id, couple: req.coupleId });
    if (!moment) {
      res.status(404).json({ error: 'Дурсамж олдсонгүй' });
      return;
    }
    if (moment.author.toString() !== req.userId) {
      res.status(403).json({ error: 'Зөвхөн өөрийн оруулсан зургаа устгана' });
      return;
    }
    await moment.deleteOne();
    // Диск дээрх зургийн файлыг устгана.
    const file = path.join(uploadsDir, path.basename(moment.imageUrl));
    fs.promises.unlink(file).catch(() => {});

    emitToCouple(req.coupleId!, 'moment:deleted', { id: req.params.id });
    res.json({ ok: true });
  }),
);

const reactSchema = z.object({ emoji: z.string().min(1).max(8) });

// Reaction toggle — нэг хэрэглэгч нэг emoji-г дарвал нэмэгдэх/арилах.
momentRouter.post(
  '/:id/react',
  asyncHandler(async (req, res) => {
    const { emoji } = reactSchema.parse(req.body);
    const moment = await Moment.findOne({ _id: req.params.id, couple: req.coupleId });
    if (!moment) {
      res.status(404).json({ error: 'Олдсонгүй' });
      return;
    }

    const idx = moment.reactions.findIndex(
      (r) => r.user.toString() === req.userId && r.emoji === emoji,
    );
    if (idx >= 0) moment.reactions.splice(idx, 1);
    else moment.reactions.push({ user: req.userId as never, emoji });
    await moment.save();
    const populated = await moment.populate('author', 'name avatar');

    emitToCouple(req.coupleId!, 'moment:react', populated);

    res.json({ moment: populated });
  }),
);
