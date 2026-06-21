import { Router } from 'express';
import { z } from 'zod';
import { Couple } from '../models/Couple.js';
import { GameRound } from '../models/GameRound.js';
import { gameQuestions } from '../data/gameQuestions.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCouple } from '../middleware/couple.js';
import { emitToCouple } from '../realtime/socket.js';

export const gameRouter = Router();

gameRouter.use(requireAuth, requireCouple);

type Choice = 'self' | 'partner' | 'both';

function sameSelection(a: string[], b: string[]): boolean {
  return [...a].sort().join(',') === [...b].sort().join(',');
}

async function getCoupleMembers(coupleId: string): Promise<string[]> {
  const couple = await Couple.findById(coupleId).select('members');
  return couple?.members.map((member) => member.toString()) ?? [];
}

async function currentRound(coupleId: string) {
  let round = await GameRound.findOne({ couple: coupleId }).sort({ roundNumber: -1 });
  if (!round) {
    round = await GameRound.create({ couple: coupleId, roundNumber: 0, questionIndex: 0 });
  }
  return round;
}

function roundPayload(
  round: Awaited<ReturnType<typeof currentRound>>,
  viewerId: string,
  memberIds: string[],
) {
  const revealed = round.answers.length >= 2;
  const ownAnswer = round.answers.find((answer) => answer.user.toString() === viewerId);
  const answerPayload = revealed
    ? round.answers.map((answer) => ({
        userId: answer.user.toString(),
        selectedUserIds: answer.selectedUsers.map((userId) => userId.toString()),
      }))
    : [];
  let myChoice: Choice | null = null;
  if (ownAnswer) {
    const selected = ownAnswer.selectedUsers.map((userId) => userId.toString());
    if (selected.length === 2) myChoice = 'both';
    else myChoice = selected[0] === viewerId ? 'self' : 'partner';
  }
  return {
    id: round._id,
    roundNumber: round.roundNumber,
    question: gameQuestions[round.questionIndex % gameQuestions.length],
    answerCount: round.answers.length,
    revealed,
    matched: revealed
      ? sameSelection(answerPayload[0].selectedUserIds, answerPayload[1].selectedUserIds)
      : null,
    answers: answerPayload,
    myChoice,
    memberIds,
  };
}

gameRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const [round, memberIds, completed] = await Promise.all([
      currentRound(req.coupleId!),
      getCoupleMembers(req.coupleId!),
      GameRound.find({ couple: req.coupleId, 'answers.1': { $exists: true } }).select('answers'),
    ]);
    const matches = completed.filter((item) => {
      const a = item.answers[0].selectedUsers.map((id) => id.toString());
      const b = item.answers[1].selectedUsers.map((id) => id.toString());
      return sameSelection(a, b);
    }).length;
    res.json({ round: roundPayload(round, req.userId!, memberIds), stats: { matches, total: completed.length } });
  }),
);

const answerSchema = z.object({ choice: z.enum(['self', 'partner', 'both']) });

gameRouter.post(
  '/answer',
  asyncHandler(async (req, res) => {
    const { choice } = answerSchema.parse(req.body);
    const [round, memberIds] = await Promise.all([
      currentRound(req.coupleId!),
      getCoupleMembers(req.coupleId!),
    ]);
    if (memberIds.length !== 2) {
      res.status(409).json({ error: 'Partner холбогдсоны дараа тоглоно' });
      return;
    }
    if (round.answers.length >= 2) {
      res.status(409).json({ error: 'Энэ асуулт дууссан байна' });
      return;
    }

    const partnerId = memberIds.find((id) => id !== req.userId)!;
    const selectedUsers =
      choice === 'both' ? memberIds : [choice === 'self' ? req.userId! : partnerId];
    const existing = round.answers.find((answer) => answer.user.toString() === req.userId);
    if (existing) existing.selectedUsers = selectedUsers as never;
    else round.answers.push({ user: req.userId as never, selectedUsers: selectedUsers as never });
    await round.save();

    const payload = roundPayload(round, req.userId!, memberIds);
    if (payload.revealed) emitToCouple(req.coupleId!, 'game:reveal', payload);
    else emitToCouple(req.coupleId!, 'game:progress', { roundId: round._id, answerCount: 1 });
    res.json({ round: payload });
  }),
);

gameRouter.post(
  '/next',
  asyncHandler(async (req, res) => {
    const [previous, memberIds] = await Promise.all([
      currentRound(req.coupleId!),
      getCoupleMembers(req.coupleId!),
    ]);
    if (previous.answers.length < 2) {
      res.status(409).json({ error: 'Хоёулаа хариулсны дараа үргэлжлүүлнэ' });
      return;
    }
    const round = await GameRound.findOneAndUpdate(
      { couple: req.coupleId, roundNumber: previous.roundNumber + 1 },
      {
        $setOnInsert: {
          questionIndex: (previous.questionIndex + 1) % gameQuestions.length,
          answers: [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const payload = roundPayload(round, req.userId!, memberIds);
    emitToCouple(req.coupleId!, 'game:new-round', payload);
    res.json({ round: payload });
  }),
);
