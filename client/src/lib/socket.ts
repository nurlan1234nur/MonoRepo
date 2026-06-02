import { io, type Socket } from 'socket.io-client';
import { getToken } from './api';

let socket: Socket | null = null;

// Нэвтэрсэн token-оор socket холбоно. Чат/mood real-time event энд ирнэ.
export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', { auth: { token: getToken() } });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
