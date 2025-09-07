// hooks/useLobbyStats.js
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function useLobbyStats(SERVER_URL) {
  const [online, setOnline] = useState(0);
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    const s = io(SERVER_URL, { transports: ['websocket'] });

    const onStats = ({ online, waiting }) => {
      setOnline(online ?? 0);
      setWaiting(waiting ?? 0);
    };

    s.on('lobby-stats', onStats);
    s.on('connect', () => s.emit('request-stats')); // 接続直後に最新値を要求

    return () => s.disconnect();
  }, [SERVER_URL]);

  return { online, waiting };
}
