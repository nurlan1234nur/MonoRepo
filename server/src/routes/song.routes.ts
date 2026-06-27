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

function currentWeekStart(): Date {
  const ulaanbaatarOffset = 8 * 60 * 60 * 1000;
  const local = new Date(Date.now() + ulaanbaatarOffset);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  local.setUTCDate(local.getUTCDate() - daysSinceMonday);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - ulaanbaatarOffset);
}

songRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const songs = await WeeklySong.find({ couple: req.coupleId })
      .sort({ weekStart: -1 })
      .limit(24)
      .populate('selectedBy', 'name avatar');
    const weekStart = currentWeekStart().toISOString();
    const current = songs.find((song) => song.weekStart.toISOString() === weekStart) ?? null;
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

songRouter.put(
  '/current',
  asyncHandler(async (req, res) => {
    const songData = songSchema.parse(req.body);
    const song = await WeeklySong.findOneAndUpdate(
      { couple: req.coupleId, weekStart: currentWeekStart() },
      { ...songData, selectedBy: req.userId },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).populate('selectedBy', 'name avatar');

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
