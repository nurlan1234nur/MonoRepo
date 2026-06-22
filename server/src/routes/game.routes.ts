import { Router } from 'express';
import { z } from 'zod';
import { Couple } from '../models/Couple.js';
import { WhoIsMoreQuiz } from '../models/WhoIsMoreQuiz.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCouple } from '../middleware/couple.js';
import { emitToCouple } from '../realtime/socket.js';

export const gameRouter = Router();
gameRouter.use(requireAuth, requireCouple);

type Choice = 'self' | 'partner' | 'both';

async function memberIds(coupleId: string): Promise<string[]> {
  const couple = await Couple.findById(coupleId).select('members');
  return couple?.members.map((member) => member.toString()) ?? [];
}

function selectedIds(choice: Choice, actorId: string, members: string[]): string[] {
  if (choice === 'both') return members;
  const partnerId = members.find((id) => id !== actorId);
  return [choice === 'self' ? actorId : partnerId!];
}

function choiceFromIds(ids: string[], viewerId: string): Choice {
  if (ids.length > 1) return 'both';
  return ids[0] === viewerId ? 'self' : 'partner';
}

function sameIds(a: string[], b: string[]): boolean {
  return [...a].sort().join(',') === [...b].sort().join(',');
}

function quizPayload(quiz: InstanceType<typeof WhoIsMoreQuiz>, viewerId: string) {
  const isCreator = quiz.creator.toString() === viewerId;
  const completed = Boolean(quiz.completedAt) || quiz.answers.length === quiz.questions.length;
  const answerByQuestion = new Map(quiz.answers.map((answer) => [answer.questionId.toString(), answer]));
  const questions = quiz.questions.map((question, index) => {
    const answer = answerByQuestion.get(question._id.toString());
    const correctIds = question.correctUserIds.map((id) => id.toString());
    const selected = answer?.selectedUserIds.map((id) => id.toString()) ?? null;
    return {
      id: question._id,
      index,
      text: question.text,
      correctUserIds: isCreator || completed ? correctIds : null,
      selectedUserIds: completed ? selected : null,
      correct: completed && selected ? sameIds(correctIds, selected) : null,
    };
  });
  const score = completed ? questions.filter((question) => question.correct).length : null;
  return {
    id: quiz._id,
    title: quiz.title,
    creatorId: quiz.creator.toString(),
    playerId: quiz.player.toString(),
    role: isCreator ? 'creator' : 'player',
    status: completed ? 'completed' : quiz.answers.length > 0 ? 'playing' : 'waiting',
    answeredCount: quiz.answers.length,
    score,
    questions,
    createdAt: quiz.createdAt,
  };
}

gameRouter.get('/', asyncHandler(async (req, res) => {
  const quiz = await WhoIsMoreQuiz.findOne({ couple: req.coupleId }).sort({ createdAt: -1 });
  res.json({ quiz: quiz ? quizPayload(quiz, req.userId!) : null });
}));

const createSchema = z.object({
  title: z.string().trim().min(1, 'Тестийн нэр оруулна уу').max(80),
  questions: z.array(z.object({
    text: z.string().trim().min(1, 'Асуултаа оруулна уу').max(160),
    choice: z.enum(['self', 'partner', 'both']),
  })).min(2, 'Хамгийн багадаа 2 асуулт оруулна уу').max(10),
});

gameRouter.post('/quiz', asyncHandler(async (req, res) => {
  const input = createSchema.parse(req.body);
  const members = await memberIds(req.coupleId!);
  if (members.length !== 2) {
    res.status(409).json({ error: 'Partner холбогдсоны дараа тест үүсгэнэ' });
    return;
  }
  const existing = await WhoIsMoreQuiz.findOne({ couple: req.coupleId }).sort({ createdAt: -1 });
  if (existing && !existing.completedAt && existing.answers.length < existing.questions.length) {
    res.status(409).json({ error: 'Одоогийн тест дуусаагүй байна' });
    return;
  }
  const playerId = members.find((id) => id !== req.userId)!;
  const quiz = await WhoIsMoreQuiz.create({
    couple: req.coupleId,
    creator: req.userId,
    player: playerId,
    title: input.title,
    questions: input.questions.map((question) => ({
      text: question.text,
      correctUserIds: selectedIds(question.choice, req.userId!, members),
    })),
  });
  emitToCouple(req.coupleId!, 'game:changed', { quizId: quiz._id });
  res.status(201).json({ quiz: quizPayload(quiz, req.userId!) });
}));

const answerSchema = z.object({
  questionId: z.string().min(1),
  choice: z.enum(['self', 'partner', 'both']),
});

gameRouter.post('/quiz/:id/answer', asyncHandler(async (req, res) => {
  const input = answerSchema.parse(req.body);
  const [quiz, members] = await Promise.all([
    WhoIsMoreQuiz.findOne({ _id: req.params.id, couple: req.coupleId }),
    memberIds(req.coupleId!),
  ]);
  if (!quiz) {
    res.status(404).json({ error: 'Тест олдсонгүй' });
    return;
  }
  if (quiz.player.toString() !== req.userId) {
    res.status(403).json({ error: 'Энэ тестийг partner бөглөнө' });
    return;
  }
  if (quiz.completedAt) {
    res.status(409).json({ error: 'Тест аль хэдийн дууссан' });
    return;
  }
  const question = quiz.questions.find((item) => item._id.toString() === input.questionId);
  if (!question) {
    res.status(404).json({ error: 'Асуулт олдсонгүй' });
    return;
  }
  if (quiz.answers.some((answer) => answer.questionId.toString() === input.questionId)) {
    res.status(409).json({ error: 'Энэ асуултад хариулсан байна' });
    return;
  }
  quiz.answers.push({
    questionId: question._id,
    selectedUserIds: selectedIds(input.choice, req.userId!, members),
  } as never);
  if (quiz.answers.length === quiz.questions.length) quiz.completedAt = new Date();
  await quiz.save();
  emitToCouple(req.coupleId!, 'game:changed', { quizId: quiz._id });
  res.json({ quiz: quizPayload(quiz, req.userId!) });
}));

gameRouter.delete('/quiz/:id', asyncHandler(async (req, res) => {
  const quiz = await WhoIsMoreQuiz.findOne({ _id: req.params.id, couple: req.coupleId });
  if (!quiz) {
    res.status(404).json({ error: 'Тест олдсонгүй' });
    return;
  }
  if (quiz.creator.toString() !== req.userId || quiz.answers.length > 0) {
    res.status(403).json({ error: 'Эхлээгүй тестийг зөвхөн үүсгэсэн хүн цуцална' });
    return;
  }
  await quiz.deleteOne();
  emitToCouple(req.coupleId!, 'game:changed', { quizId: null });
  res.json({ ok: true });
}));
