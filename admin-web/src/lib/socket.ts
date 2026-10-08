import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket && typeof window !== 'undefined') {
    const token = localStorage.getItem('fleet_token') || '';
    const socketBase = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    socket = io(`${socketBase}/realtime`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket as Socket;
};
