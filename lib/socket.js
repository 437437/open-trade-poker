// lib/socket.js
import { io } from 'socket.io-client';

let socket = null;

/** アプリ全体で共有する単一の socket を返す */
export function getSocket(SERVER_URL) {
  if (socket) return socket; // 既に生成済みならそれを返す
  socket = io(SERVER_URL, { transports: ['websocket'], autoConnect: true });

  // HMR対策（デバッグ時に見えるように）
  if (typeof global !== 'undefined') {
    global.__OTP_SOCKET__ = socket;
  }
  return socket;
}

/** 明示的に切断したい時だけ使う（通常は使わない） */
export function closeSocket() {
  if (!socket) return;
  socket.removeAllListeners?.();
  socket.disconnect?.();
  socket = null;
}
