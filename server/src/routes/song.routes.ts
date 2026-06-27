import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { z } from 'zod';
import { WeeklySong } from '../models/WeeklySong.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCouple } from '../middleware/couple.js';
import { emitToCouple } from '../realtime/socket.js';

export const songRouter = Router();

songRouter.use(requireAuth, requireCouple);

songRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const songs = await WeeklySong.find({ couple: req.coupleId })
      .sort({ createdAt: -1 })
      .limit(24)
      .populate('selectedBy', 'name avatar');
    const current = songs[0] ?? null;
    res.json({ current, songs });
  }),
);

const previewSchema = z.object({ url: z.string().trim().url().max(1000) });
const youtubeHosts = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

songRouter.post(
  '/youtube-preview',
  asyncHandler(async (req, res) => {
    const { url } = previewSchema.parse(req.body);
    const parsed = new URL(url);
    if (!youtubeHosts.has(parsed.hostname.toLowerCase())) {
      res.status(400).json({ error: 'YouTube холбоос оруулна уу' });
      return;
    }

    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(parsed.toString())}&format=json`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) {
      res.status(400).json({ error: 'YouTube видео олдсонгүй' });
      return;
    }
    const metadata = (await response.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    res.json({
      title: metadata.title ?? '',
      artist: metadata.author_name ?? '',
      thumbnailUrl: metadata.thumbnail_url ?? '',
    });
  }),
);

const songSchema = z.object({
  title: z.string().trim().min(1).max(150),
  artist: z.string().trim().min(1).max(120),
  url: z
    .string()
    .trim()
    .url('Дууны холбоос буруу байна')
    .max(1000)
    .refine((value) => value.startsWith('https://') || value.startsWith('http://'), 'HTTP холбоос оруулна уу'),
  thumbnailUrl: z.string().trim().url().max(1000).or(z.literal('')).optional(),
});

songRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const songData = songSchema.parse(req.body);
    const song = await WeeklySong.create({
      ...songData,
      couple: req.coupleId,
      weekStart: new Date(),
      selectedBy: req.userId,
    });
    await song.populate('selectedBy', 'name avatar');

    emitToCouple(req.coupleId!, 'song:update', song);
    res.json({ song });
  }),
);

songRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ error: 'Дууны ID буруу байна' });
      return;
    }

    const songData = songSchema.parse(req.body);
    const song = await WeeklySong.findOneAndUpdate(
      { _id: req.params.id, couple: req.coupleId },
      songData,
      { new: true, runValidators: true },
    ).populate('selectedBy', 'name avatar');
    if (!song) {
      res.status(404).json({ error: 'Дуу олдсонгүй' });
      return;
    }

    emitToCouple(req.coupleId!, 'song:update', song);
    res.json({ song });
  }),
);

songRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ error: 'Дууны ID буруу байна' });
      return;
    }

    const song = await WeeklySong.findOneAndDelete({ _id: req.params.id, couple: req.coupleId });
    if (!song) {
      res.status(404).json({ error: 'Дуу олдсонгүй' });
      return;
    }

    emitToCouple(req.coupleId!, 'song:delete', { id: song._id.toString() });
    res.json({ ok: true });
  }),
);
