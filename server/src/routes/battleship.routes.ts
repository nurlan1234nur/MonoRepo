import { Router } from 'express';
import { z } from 'zod';
import { GameBoard, Ship, type Direction, type ShipType } from 'battleships-engine';
import { Couple } from '../models/Couple.js';
import { BattleshipGame } from '../models/BattleshipGame.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCouple } from '../middleware/couple.js';
import { emitToCouple } from '../realtime/socket.js';

export const battleshipRouter = Router();

battleshipRouter.use(requireAuth, requireCouple);

const shipLengths: Record<ShipType, number> = {
  aircraft_carrier: 5,
  battleship: 4,
  destroyer: 3,
  submarine: 3,
  cruiser: 2,
};

type StoredShip = { type: string; x: number; y: number; direction: string };
type StoredShot = { x: number; y: number; result: string; sunkShip?: string };

function createBoard(ships: StoredShip[]): GameBoard {
  return new GameBoard(
    ships.map(
      (ship) =>
        new Ship({
          type: ship.type as ShipType,
          coords: { x: ship.x, y: ship.y },
          direction: ship.direction as Direction,
        }),
    ),
  );
}

function randomValidBoard(): GameBoard {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const board = new GameBoard();
    board.randomlyPlaceShips();
    const cells = [...board.ships.values()].flatMap((ship) => [...ship]);
    const valid =
      board.ships.size === 5 &&
      cells.length === 17 &&
      cells.every((cell) => cell.x >= 1 && cell.x <= 10 && cell.y >= 1 && cell.y <= 10);
    if (valid) return board;
  }
  throw new Error('Онгоц байрлуулах боломжгүй байна');
}

function shipCells(ship: StoredShip): Array<{ x: number; y: number }> {
  const length = shipLengths[ship.type as ShipType];
  return Array.from({ length }, (_, index) => ({
    x: ship.x + (ship.direction === 'hor' ? index : 0),
    y: ship.y + (ship.direction === 'vert' ? index : 0),
  }));
}

async function getGame(coupleId: string) {
  const couple = await Couple.findById(coupleId).select('members');
  let game = await BattleshipGame.findOne({ couple: coupleId });
  if (!game) {
    game = await BattleshipGame.findOneAndUpdate(
      { couple: coupleId },
      { $setOnInsert: { players: couple?.members.map((user) => ({ user })) ?? [] } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  if (!game) throw new Error('Battleship game үүсгэж чадсангүй');
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

function gamePayload(game: Awaited<ReturnType<typeof getGame>>, viewerId: string) {
  const me = game.players.find((player) => player.user.toString() === viewerId);
  const opponent = game.players.find((player) => player.user.toString() !== viewerId);
  if (!me || !opponent) throw new Error('Battleship player олдсонгүй');

  const incomingShots = opponent.shots.map((shot) => ({
    x: shot.x,
    y: shot.y,
    result: shot.result,
    sunkShip: shot.sunkShip,
  }));
  return {
    id: game._id,
    status: game.status,
    turnUserId: game.turn?.toString() ?? null,
    winnerUserId: game.winner?.toString() ?? null,
    me: {
      ready: me.ready,
      ships: me.ships.map((ship) => ({
        type: ship.type,
        cells: shipCells(ship),
      })),
      incomingShots,
    },
    opponent: {
      ready: opponent.ready,
      shots: me.shots.map((shot) => ({
        x: shot.x,
        y: shot.y,
        result: shot.result,
        sunkShip: shot.sunkShip,
      })),
    },
  };
}

function notifyChanged(coupleId: string): void {
  emitToCouple(coupleId, 'battleship:changed', { at: Date.now() });
}

battleshipRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const game = await getGame(req.coupleId!);
    res.json({ game: gamePayload(game, req.userId!) });
  }),
);

battleshipRouter.post(
  '/randomize',
  asyncHandler(async (req, res) => {
    const game = await getGame(req.coupleId!);
    const player = game.players.find((item) => item.user.toString() === req.userId);
    if (!player) {
      res.status(403).json({ error: 'Тоглогч олдсонгүй' });
      return;
    }
    if (game.status !== 'placement' || player.ready) {
      res.status(409).json({ error: 'Одоо онгоц сольж болохгүй' });
      return;
    }

    const board = randomValidBoard();
    player.ships = [...board.ships.values()].map((ship) => ({
      type: ship.type,
      x: ship.coords.x,
      y: ship.coords.y,
      direction: ship.direction,
    })) as never;
    await game.save();
    res.json({ game: gamePayload(game, req.userId!) });
  }),
);

battleshipRouter.post(
  '/ready',
  asyncHandler(async (req, res) => {
    const game = await getGame(req.coupleId!);
    const player = game.players.find((item) => item.user.toString() === req.userId);
    if (!player || player.ships.length !== 5) {
      res.status(409).json({ error: 'Эхлээд онгоцуудаа байрлуулна уу' });
      return;
    }
    player.ready = true;
    if (game.players.length === 2 && game.players.every((item) => item.ready)) {
      game.status = 'playing';
      game.turn = game.players[0].user;
    }
    await game.save();
    notifyChanged(req.coupleId!);
    res.json({ game: gamePayload(game, req.userId!) });
  }),
);

const fireSchema = z.object({ x: z.number().int().min(1).max(10), y: z.number().int().min(1).max(10) });

battleshipRouter.post(
  '/fire',
  asyncHandler(async (req, res) => {
    const { x, y } = fireSchema.parse(req.body);
    const game = await getGame(req.coupleId!);
    if (game.status !== 'playing' || game.turn?.toString() !== req.userId) {
      res.status(409).json({ error: 'Одоо таны ээлж биш байна' });
      return;
    }
    const attacker = game.players.find((item) => item.user.toString() === req.userId)!;
    const defender = game.players.find((item) => item.user.toString() !== req.userId)!;
    if (attacker.shots.some((shot) => shot.x === x && shot.y === y)) {
      res.status(409).json({ error: 'Энэ координат руу аль хэдийн буудсан' });
      return;
    }

    const board = createBoard(defender.ships);
    for (const shot of attacker.shots) board.receiveAttack({ x: shot.x, y: shot.y });
    const cellKey = `(${x},${y})`;
    const hitShipType = board.takenCells.get(cellKey);
    board.receiveAttack({ x, y });
    const sunk = hitShipType ? board.ships.get(hitShipType)?.isSunk() ?? false : false;
    attacker.shots.push({
      x,
      y,
      result: hitShipType ? (sunk ? 'sunk' : 'hit') : 'miss',
      sunkShip: sunk ? hitShipType : '',
    });

    if (board.hasLost()) {
      game.status = 'finished';
      game.winner = attacker.user;
      game.turn = null;
    } else {
      game.turn = defender.user;
    }
    await game.save();
    notifyChanged(req.coupleId!);
    res.json({ game: gamePayload(game, req.userId!) });
  }),
);

battleshipRouter.post(
  '/reset',
  asyncHandler(async (req, res) => {
    const game = await getGame(req.coupleId!);
    if (game.status !== 'finished') {
      res.status(409).json({ error: 'Одоогийн тоглоом дуусаагүй байна' });
      return;
    }
    game.status = 'placement';
    game.turn = null;
    game.winner = null;
    for (const player of game.players) {
      player.ready = false;
      player.ships.splice(0, player.ships.length);
      player.shots.splice(0, player.shots.length);
    }
    await game.save();
    notifyChanged(req.coupleId!);
    res.json({ game: gamePayload(game, req.userId!) });
  }),
);
