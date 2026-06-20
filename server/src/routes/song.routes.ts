import { Router } from 'express';
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

const songSchema = z.object({
  title: z.string().trim().min(1).max(150),
  artist: z.string().trim().min(1).max(120),
  url: z
    .string()
    .trim()
    .url('Дууны холбоос буруу байна')
    .max(1000)
    .refine((value) => value.startsWith('https://') || value.startsWith('http://'), 'HTTP холбоос оруулна уу'),
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
