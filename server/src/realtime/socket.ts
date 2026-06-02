import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

let io: SocketServer | null = null;

// Хос бүр өөрийн "room"-той — зөвхөн тэр хосын гишүүд event авна.
function coupleRoom(coupleId: string): string {
  return `couple:${coupleId}`;
}

export function initSocket(server: HttpServer): void {
  io = new SocketServer(server, {
    cors: { origin: env.clientOrigin, credentials: true },
  });

  // Socket-ийн JWT баталгаажуулалт.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('Token шаардлагатай'));
      const { userId } = verifyToken(token);
      const user = await User.findById(userId).select('couple');
      if (!user?.couple) return next(new Error('Хос холбоогүй'));
      socket.data.coupleId = user.couple.toString();
      next();
    } catch {
      next(new Error('Нэвтрэлт амжилтгүй'));
    }
  });

  io.on('connection', (socket) => {
    const coupleId = socket.data.coupleId as string;
    socket.join(coupleRoom(coupleId));

    socket.on('typing', (isTyping: boolean) => {
      socket.to(coupleRoom(coupleId)).emit('partner:typing', isTyping);
    });
  });
}

// Route-уудаас real-time event илгээх.
export function emitToCouple(coupleId: string, event: string, payload: unknown): void {
  io?.to(coupleRoom(coupleId)).emit(event, payload);
}
