import { io, type Socket } from 'socket.io-client';
import { getToken } from './api';

let socket: Socket | null = null;
const SOCKET_ORIGIN = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, '') || '/';

// Нэвтэрсэн token-оор socket холбоно. Чат/mood real-time event энд ирнэ.
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_ORIGIN, { auth: { token: getToken() } });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
