// hooks/useLobbyStats.js
import { useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { getSocket } from '../lib/socket';

export default function useLobbyStats(SERVER_URL) {
  const [online, setOnline] = useState(0);
  const [waiting, setWaiting] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const lastUpdatedRef = useRef(0);

  useEffect(() => {
    const s = getSocket(SERVER_URL);

    const markUpdated = () => {
      lastUpdatedRef.current = Date.now();
      setLoading(false);
      setIsStale(false);
    };

    const onStats = ({ online, waiting }) => {
      setOnline(online ?? 0);
      setWaiting(waiting ?? 0);
      markUpdated();
    };

    const requestNow = () => s.emit('request-stats');

    s.on('lobby-stats', onStats);
    if (s.connected) requestNow();
    s.on('connect', requestNow);
    s.on('reconnect', requestNow);

    // 保険ポーリング
    const poll = setInterval(requestNow, 5000);

    // ステール監視
    const staleWatch = setInterval(() => {
      const age = Date.now() - lastUpdatedRef.current;
      setIsStale(age > 10000); // 10秒超はステール表示
    }, 2000);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') requestNow();
    });

    return () => {
      s.off('lobby-stats', onStats);
      s.off('connect', requestNow);
      s.off('reconnect', requestNow);
      clearInterval(poll);
      clearInterval(staleWatch);
      sub.remove();
    };
  }, [SERVER_URL]);

  return { online, waiting, loading, isStale };
}
