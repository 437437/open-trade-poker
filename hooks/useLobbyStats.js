import { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';

export default function useLobbyStats(SERVER_URL) {
  const [online, setOnline] = useState(0);
  const [waiting, setWaiting] = useState(0);

  useEffect(() => {
    const s = getSocket(SERVER_URL);

    const onStats = ({ online, waiting }) => {
      setOnline(online ?? 0);
      setWaiting(waiting ?? 0);
    };

    s.on('lobby-stats', onStats);
    if (s.connected) s.emit('request-stats');
    else s.once('connect', () => s.emit('request-stats'));

    return () => {
      s.off('lobby-stats', onStats);
      // ここで s.disconnect() しない！共有だから
    };
  }, [SERVER_URL]);

  return { online, waiting };
}
