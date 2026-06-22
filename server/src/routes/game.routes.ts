import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { Couple } from '../models/Couple.js';
import { User } from '../models/User.js';
import { WhoIsMoreQuiz } from '../models/WhoIsMoreQuiz.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCouple } from '../middleware/couple.js';
import { emitToCouple } from '../realtime/socket.js';

export const gameRouter = Router();
gameRouter.use(requireAuth, requireCouple);

async function migrateLegacyQuiz(quiz: InstanceType<typeof WhoIsMoreQuiz>): Promise<void> {
  if (quiz.questions.every((question) => question.options.length >= 2 && question.correctOptionId)) return;
  const users = await User.find({ _id: { $in: [quiz.creator, quiz.player] } }).select('name');
  const nameById = new Map(users.map((user) => [user._id.toString(), user.name]));
  const creatorId = quiz.creator.toString();
  const playerId = quiz.player.toString();

  for (const question of quiz.questions) {
    if (question.options.length >= 2 && question.correctOptionId) continue;
    const options = [
      { _id: new Types.ObjectId(), text: nameById.get(creatorId) ?? 'Тест үүсгэсэн хүн' },
      { _id: new Types.ObjectId(), text: nameById.get(playerId) ?? 'Тест тоглох хүн' },
      { _id: new Types.ObjectId(), text: 'Хоёулаа' },
    ];
    const legacyCorrect = question.correctUserIds.map((id) => id.toString());
    const correctIndex = legacyCorrect.length > 1 ? 2 : legacyCorrect[0] === playerId ? 1 : 0;
    question.options = options as never;
    question.correctOptionId = options[correctIndex]._id;
  }

  for (const answer of quiz.answers) {
    if (answer.selectedOptionId) continue;
    const question = quiz.questions.find((item) => item._id.toString() === answer.questionId.toString());
    if (!question) continue;
    const legacySelected = answer.selectedUsers.map((id) => id.toString());
    const selectedIndex = legacySelected.length > 1 ? 2 : legacySelected[0] === playerId ? 1 : 0;
    answer.selectedOptionId = question.options[selectedIndex]._id;
  }
  await quiz.save();
}

async function memberIds(coupleId: string): Promise<string[]> {
  const couple = await Couple.findById(coupleId).select('members');
  return couple?.members.map((member) => member.toString()) ?? [];
}

function quizStatus(quiz: InstanceType<typeof WhoIsMoreQuiz>): 'waiting' | 'playing' | 'completed' {
  if (quiz.completedAt || quiz.answers.length === quiz.questions.length) return 'completed';
  return quiz.answers.length > 0 ? 'playing' : 'waiting';
}

function quizSummary(quiz: InstanceType<typeof WhoIsMoreQuiz>, viewerId: string) {
  const status = quizStatus(quiz);
  const isCreator = quiz.creator.toString() === viewerId;
  const score = status === 'completed'
    ? quiz.questions.filter((question) => {
        const answer = quiz.answers.find((item) => item.questionId.toString() === question._id.toString());
        return answer?.selectedOptionId?.toString() === question.correctOptionId?.toString();
      }).length
    : null;
  return {
    id: quiz._id,
    title: quiz.title,
    creatorId: quiz.creator.toString(),
    playerId: quiz.player.toString(),
    role: isCreator ? 'creator' : 'player',
    status,
    answeredCount: quiz.answers.length,
    questionCount: quiz.questions.length,
    score,
    canEdit: isCreator && quiz.answers.length === 0,
    createdAt: quiz.createdAt,
  };
}

function quizPayload(quiz: InstanceType<typeof WhoIsMoreQuiz>, viewerId: string) {
  const summary = quizSummary(quiz, viewerId);
  const completed = summary.status === 'completed';
  const isCreator = summary.role === 'creator';
  return {
    ...summary,
    questions: quiz.questions.map((question, index) => {
      const answer = quiz.answers.find((item) => item.questionId.toString() === question._id.toString());
      const selectedOptionId = answer?.selectedOptionId?.toString() ?? null;
      const correctOptionId = question.correctOptionId?.toString() ?? null;
      return {
        id: question._id,
        index,
        text: question.text,
        options: question.options.map((option) => ({ id: option._id, text: option.text })),
        correctOptionId: isCreator || completed ? correctOptionId : null,
        selectedOptionId: completed ? selectedOptionId : null,
        correct: completed && selectedOptionId ? selectedOptionId === correctOptionId : null,
      };
    }),
  };
}

gameRouter.get('/', asyncHandler(async (req, res) => {
  const quizzes = await WhoIsMoreQuiz.find({ couple: req.coupleId }).sort({ createdAt: -1 });
  await Promise.all(quizzes.map((quiz) => migrateLegacyQuiz(quiz)));
  res.json({ quizzes: quizzes.map((quiz) => quizSummary(quiz, req.userId!)) });
}));

gameRouter.get('/quiz/:id', asyncHandler(async (req, res) => {
  const quiz = await WhoIsMoreQuiz.findOne({ _id: req.params.id, couple: req.coupleId });
  if (!quiz) {
    res.status(404).json({ error: 'Тест олдсонгүй' });
    return;
  }
  await migrateLegacyQuiz(quiz);
  res.json({ quiz: quizPayload(quiz, req.userId!) });
}));

const quizInputSchema = z.object({
  title: z.string().trim().min(1, 'Тестийн нэр оруулна уу').max(80),
  questions: z.array(z.object({
    text: z.string().trim().min(1, 'Асуултаа оруулна уу').max(160),
    options: z.array(z.string().trim().min(1).max(80)).min(2).max(5),
    correctIndex: z.number().int().min(0),
  }).refine((question) => question.correctIndex < question.options.length, 'Зөв хариултаа сонгоно уу'))
    .min(2, 'Хамгийн багадаа 2 асуулт оруулна уу').max(10),
});

function storedQuestions(input: z.infer<typeof quizInputSchema>['questions']) {
  return input.map((question) => {
    const options = question.options.map((text) => ({ _id: new Types.ObjectId(), text }));
    return {
      text: question.text,
      options,
      correctOptionId: options[question.correctIndex]._id,
    };
  });
}

gameRouter.post('/quiz', asyncHandler(async (req, res) => {
  const input = quizInputSchema.parse(req.body);
  const members = await memberIds(req.coupleId!);
  if (members.length !== 2) {
    res.status(409).json({ error: 'Partner холбогдсоны дараа тест үүсгэнэ' });
    return;
  }
  const playerId = members.find((id) => id !== req.userId)!;
  const quiz = await WhoIsMoreQuiz.create({
    couple: req.coupleId,
    creator: req.userId,
    player: playerId,
    title: input.title,
    questions: storedQuestions(input.questions),
  });
  emitToCouple(req.coupleId!, 'game:changed', { quizId: quiz._id });
  res.status(201).json({ quiz: quizPayload(quiz, req.userId!) });
}));

gameRouter.put('/quiz/:id', asyncHandler(async (req, res) => {
  const input = quizInputSchema.parse(req.body);
  const quiz = await WhoIsMoreQuiz.findOne({ _id: req.params.id, couple: req.coupleId });
  if (!quiz) {
    res.status(404).json({ error: 'Тест олдсонгүй' });
    return;
  }
  if (quiz.creator.toString() !== req.userId || quiz.answers.length > 0) {
    res.status(403).json({ error: 'Хариулт эхлээгүй тестийг зөвхөн үүсгэсэн хүн засна' });
    return;
  }
  quiz.title = input.title;
  quiz.questions = storedQuestions(input.questions) as never;
  await quiz.save();
  emitToCouple(req.coupleId!, 'game:changed', { quizId: quiz._id });
  res.json({ quiz: quizPayload(quiz, req.userId!) });
}));

const answerSchema = z.object({ questionId: z.string().min(1), optionId: z.string().min(1) });

gameRouter.post('/quiz/:id/answer', asyncHandler(async (req, res) => {
  const input = answerSchema.parse(req.body);
  const quiz = await WhoIsMoreQuiz.findOne({ _id: req.params.id, couple: req.coupleId });
  if (!quiz) {
    res.status(404).json({ error: 'Тест олдсонгүй' });
    return;
  }
  await migrateLegacyQuiz(quiz);
  if (quiz.player.toString() !== req.userId) {
    res.status(403).json({ error: 'Энэ тестийг partner бөглөнө' });
    return;
  }
  if (quiz.completedAt) {
    res.status(409).json({ error: 'Тест аль хэдийн дууссан' });
    return;
  }
  const question = quiz.questions.find((item) => item._id.toString() === input.questionId);
  if (!question || !question.options.some((option) => option._id.toString() === input.optionId)) {
    res.status(404).json({ error: 'Асуулт эсвэл хариултын сонголт олдсонгүй' });
    return;
  }
  if (quiz.answers.some((answer) => answer.questionId.toString() === input.questionId)) {
    res.status(409).json({ error: 'Энэ асуултад хариулсан байна' });
    return;
  }
  quiz.answers.push({ questionId: question._id, selectedOptionId: new Types.ObjectId(input.optionId) } as never);
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
    res.status(403).json({ error: 'Эхлээгүй тестийг зөвхөн үүсгэсэн хүн устгана' });
    return;
  }
  await quiz.deleteOne();
  emitToCouple(req.coupleId!, 'game:changed', { quizId: null });
  res.json({ ok: true });
}));
