// hooks/usePresence.js
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getSocket } from '../lib/socket';

export default function usePresence(SERVER_URL) {
  useEffect(() => {
    const s = getSocket(SERVER_URL);

    const setActive = () => s.emit('presence', { state: 'active' });
    const setBackground = () => s.emit('presence', { state: 'background' });

    if (s.connected) setActive();
    else s.once('connect', setActive);

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') setActive();
      else setBackground();
    });

    // 保険の心拍（iOSで止まることもあるが lastSeen 更新目的）
    const beat = setInterval(() => s.emit('presence-ping'), 15000);

    return () => {
      sub.remove();
      clearInterval(beat);
      s.off('connect', setActive);
    };
  }, [SERVER_URL]);
}
