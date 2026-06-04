import { Router } from 'express';
import { z } from 'zod';
import { DailyAnswer } from '../models/DailyAnswer.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCouple } from '../middleware/couple.js';
import { emitToCouple } from '../realtime/socket.js';
import { questions, questionIndexForDate, todayStr } from '../data/questions.js';

export const dailyRouter = Router();

dailyRouter.use(requireAuth, requireCouple);

// Өнөөдрийн асуулт + хосын 2 гишүүний хариулт.
dailyRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const date = todayStr();
    const index = questionIndexForDate(date);
    const answers = await DailyAnswer.find({ couple: req.coupleId, date }).populate('user', 'name avatar');
    res.json({ date, question: questions[index], questionIndex: index, answers });
  }),
);

// Бүх өнгөрсөн өдрийн асуулт + хариултууд (огноогоор бүлэглэсэн, шинэ→хуучин).
dailyRouter.get(
  '/history',
  asyncHandler(async (req, res) => {
    const rows = await DailyAnswer.find({ couple: req.coupleId })
      .populate('user', 'name avatar')
      .sort({ date: -1 });

    const byDate = new Map<string, { date: string; questionIndex: number; question: string; answers: typeof rows }>();
    for (const r of rows) {
      let day = byDate.get(r.date);
      if (!day) {
        day = { date: r.date, questionIndex: r.questionIndex, question: questions[r.questionIndex], answers: [] as typeof rows };
        byDate.set(r.date, day);
      }
      day.answers.push(r);
    }
    res.json({ days: [...byDate.values()] });
  }),
);

const answerSchema = z.object({ text: z.string().min(1).max(1000) });

dailyRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { text } = answerSchema.parse(req.body);
    const date = todayStr();
    const index = questionIndexForDate(date);
    const answer = await DailyAnswer.findOneAndUpdate(
      { couple: req.coupleId, user: req.userId, date },
      { questionIndex: index, text },
      { new: true, upsert: true },
    );
    const populated = await answer.populate('user', 'name avatar');

    emitToCouple(req.coupleId!, 'daily:answer', populated);

    res.status(201).json({ answer: populated });
  }),
);
