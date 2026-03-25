import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';
import type { ClientToServerEvents, ServerToClientEvents } from '@auction/shared';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

function getLatestAccessToken() {
  return useAuthStore.getState().tokens?.accessToken;
}

function setSocketAuthToken(target: AppSocket, token: string | undefined) {
  target.auth = { token };
}

export function getSocket(): AppSocket {
  if (!socket) {
    const token = getLatestAccessToken();
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(): AppSocket {
  const s = getSocket();
  const previousToken = (s.auth as { token?: string } | undefined)?.token;
  const latestToken = getLatestAccessToken();
  setSocketAuthToken(s, latestToken);

  if (!latestToken) {
    if (s.connected) s.disconnect();
    return s;
  }

  if (s.connected && previousToken && previousToken !== latestToken) {
    s.disconnect();
  }

  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
