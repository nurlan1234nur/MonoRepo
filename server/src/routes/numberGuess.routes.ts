import { Router } from 'express';
import { z } from 'zod';
import { Couple } from '../models/Couple.js';
import { NumberGuessGame } from '../models/NumberGuessGame.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCouple } from '../middleware/couple.js';
import { emitToCouple } from '../realtime/socket.js';

export const numberGuessRouter = Router();
numberGuessRouter.use(requireAuth, requireCouple);

const codeSchema = z.object({ code: z.string().regex(/^\d{4}$/, '4 оронтой тоо оруулна уу') });

async function getGame(coupleId: string) {
  const couple = await Couple.findById(coupleId).select('members');
  let game = await NumberGuessGame.findOne({ couple: coupleId });
  if (!game) {
    game = await NumberGuessGame.findOneAndUpdate(
      { couple: coupleId },
      { $setOnInsert: { players: couple?.members.map((user) => ({ user })) ?? [] } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  if (!game) throw new Error('Тоо олох тоглоом үүсгэж чадсангүй');

  let changed = false;
  for (const member of couple?.members ?? []) {
    if (!game.players.some((player) => player.user.toString() === member.toString())) {
      game.players.push({ user: member } as never);
      changed = true;
    }
  }
  if (changed) await game.save();
  return game;
}

function scoreGuess(secret: string, guess: string): { alpha: number; betta: number } {
  let alpha = 0;
  const remainingSecret: string[] = [];
  const remainingGuess: string[] = [];

  for (let index = 0; index < 4; index += 1) {
    if (secret[index] === guess[index]) {
      alpha += 1;
    } else {
      remainingSecret.push(secret[index]);
      remainingGuess.push(guess[index]);
    }
  }

  const counts = new Map<string, number>();
  for (const digit of remainingSecret) counts.set(digit, (counts.get(digit) ?? 0) + 1);

  let betta = 0;
  for (const digit of remainingGuess) {
    const count = counts.get(digit) ?? 0;
    if (count > 0) {
      betta += 1;
      counts.set(digit, count - 1);
    }
  }

  return { alpha, betta };
}

function payload(game: Awaited<ReturnType<typeof getGame>>, viewerId: string) {
  const me = game.players.find((player) => player.user.toString() === viewerId);
  const opponent = game.players.find((player) => player.user.toString() !== viewerId);
  if (!me || !opponent) throw new Error('Хоёр тоглогч бүрэн холбогдоогүй байна');

  return {
    id: game._id,
    status: game.status,
    turnUserId: game.turn?.toString() ?? null,
    winnerUserId: game.winner?.toString() ?? null,
    resetApprovals: game.resetApprovals.map((user) => user.toString()),
    me: {
      ready: me.ready,
      secret: me.secret,
    },
    opponent: {
      ready: opponent.ready,
      secret: game.status === 'finished' ? opponent.secret : '',
    },
    attempts: game.attempts.map((attempt) => ({
      id: attempt._id,
      userId: attempt.user.toString(),
      guess: attempt.guess,
      alpha: attempt.alpha,
      betta: attempt.betta,
      createdAt: attempt.createdAt,
    })),
  };
}

function notifyChanged(coupleId: string): void {
  emitToCouple(coupleId, 'number-guess:changed', { at: Date.now() });
}

numberGuessRouter.get('/', asyncHandler(async (req, res) => {
  const game = await getGame(req.coupleId!);
  res.json({ game: payload(game, req.userId!) });
}));

numberGuessRouter.post('/secret', asyncHandler(async (req, res) => {
  const { code } = codeSchema.parse(req.body);
  const game = await getGame(req.coupleId!);
  if (game.status !== 'setup') {
    res.status(409).json({ error: 'Тоглоом эхэлсэн тул нууц тоо солих боломжгүй' });
    return;
  }
  const player = game.players.find((item) => item.user.toString() === req.userId);
  if (!player) {
    res.status(404).json({ error: 'Тоглогч олдсонгүй' });
    return;
  }
  player.secret = code;
  player.ready = true;
  game.resetApprovals.splice(0, game.resetApprovals.length);
  if (game.players.length === 2 && game.players.every((item) => item.ready)) {
    game.status = 'playing';
    game.turn = game.players[Math.floor(Math.random() * 2)].user;
  }
  await game.save();
  notifyChanged(req.coupleId!);
  res.json({ game: payload(game, req.userId!) });
}));

numberGuessRouter.post('/guess', asyncHandler(async (req, res) => {
  const { code } = codeSchema.parse(req.body);
  const game = await getGame(req.coupleId!);
  if (game.status !== 'playing' || game.turn?.toString() !== req.userId) {
    res.status(409).json({ error: 'Одоо таны ээлж биш байна' });
    return;
  }
  const attacker = game.players.find((item) => item.user.toString() === req.userId);
  const defender = game.players.find((item) => item.user.toString() !== req.userId);
  if (!attacker || !defender?.secret) {
    res.status(409).json({ error: 'Тоглоом эхлэхэд бэлэн биш байна' });
    return;
  }

  const result = scoreGuess(defender.secret, code);
  game.attempts.push({ user: attacker.user, guess: code, ...result } as never);
  if (result.alpha === 4) {
    game.status = 'finished';
    game.winner = attacker.user;
    game.turn = null;
  } else {
    game.turn = defender.user;
  }
  await game.save();
  notifyChanged(req.coupleId!);
  res.json({ game: payload(game, req.userId!) });
}));

function resetGameState(game: Awaited<ReturnType<typeof getGame>>): void {
  game.status = 'setup';
  game.turn = null;
  game.winner = null;
  game.attempts.splice(0, game.attempts.length);
  game.resetApprovals.splice(0, game.resetApprovals.length);
  for (const player of game.players) {
    player.secret = '';
    player.ready = false;
  }
}

numberGuessRouter.post('/reset-request', asyncHandler(async (req, res) => {
  const game = await getGame(req.coupleId!);
  if (!game.players.some((player) => player.user.toString() === req.userId)) {
    res.status(403).json({ error: 'Тоглогч олдсонгүй' });
    return;
  }
  if (!game.resetApprovals.some((user) => user.toString() === req.userId)) {
    game.resetApprovals.push(req.userId as never);
  }
  if (game.players.length === 2 && game.players.every((player) => game.resetApprovals.some((user) => user.toString() === player.user.toString()))) {
    resetGameState(game);
  }
  await game.save();
  notifyChanged(req.coupleId!);
  res.json({ game: payload(game, req.userId!) });
}));

numberGuessRouter.post('/reset-cancel', asyncHandler(async (req, res) => {
  const game = await getGame(req.coupleId!);
  game.resetApprovals = game.resetApprovals.filter((user) => user.toString() !== req.userId) as never;
  await game.save();
  notifyChanged(req.coupleId!);
  res.json({ game: payload(game, req.userId!) });
}));
