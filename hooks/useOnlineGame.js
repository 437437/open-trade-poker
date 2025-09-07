// hooks/useOnlineGame.js
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { calculateScore } from '../shared/gameLogic';

export default function useOnlineGame(SERVER_URL) {
  const [socket, setSocket] = useState(null);
  const [scene, setScene] = useState('home');   // 'home' | 'waiting' | 'matched' | 'playing' | 'done'
  const [message, setMessage] = useState('待機中…');
  const [preGameCountdown, setPreGameCountdown] = useState(3);
  const [hand, setHand] = useState([]);
  const [oppHand, setOppHand] = useState([]);
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [opponentSlot, setOpponentSlot] = useState([]);
  const [opponentSlotCount, setOpponentSlotCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [phase, setPhase] = useState('waiting'); // 'waiting'|'submitting'|'waitingForOpponent'|'done'
  const [turnCount, setTurnCount] = useState(1);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const opponentIdRef = useRef(null);

  // --- refs（ソケットコールバックの古い値問題を避ける） ---
  const phaseRef = useRef(phase);            useEffect(()=>{ phaseRef.current = phase; }, [phase]);
  const isMyTurnRef = useRef(isMyTurn);      useEffect(()=>{ isMyTurnRef.current = isMyTurn; }, [isMyTurn]);
  const selectedRef = useRef(selectedIndexes);useEffect(()=>{ selectedRef.current = selectedIndexes; }, [selectedIndexes]);
  const handRef = useRef(hand);              useEffect(()=>{ handRef.current = hand; }, [hand]);
  const opponentSlotCountRef = useRef(opponentSlotCount);
  useEffect(()=>{ opponentSlotCountRef.current = opponentSlotCount; }, [opponentSlotCount]);

  useEffect(() => {
    const s = io(SERVER_URL, { transports: ['websocket'] });
    setSocket(s);

    s.on('connect', () => console.log('✅ Connected'));

    s.on('match', ({ opponentId }) => {
      opponentIdRef.current = opponentId;
      setScene('matched');
      setPreGameCountdown(3);
      setMessage(`対戦相手が見つかりました！\nゲーム開始まで... 3`);

      // 3,2,1 カウントダウン
      const timer = setInterval(() => {
        setPreGameCountdown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          const next = prev - 1;
          setMessage(`対戦相手が見つかりました！\nゲーム開始まで... ${next}`);
          return next;
        });
      }, 1000);
    });

    s.on('start-game', (data) => {
      // すぐ開始（演出を入れるなら setTimeout で調整）
      setScene('playing');
      setTurnCount(1);
      setHand([...data.hand].sort());
      setOppHand([...data.opponentHand].sort());
      setIsMyTurn(data.first);
      setPhase(data.first ? 'submitting' : 'waiting');

      const head = '第1ターン';
      const role = data.first ? '先攻です。' : '後攻です。';
      const act  = data.first ? '1〜4枚カードを選んでください' : '相手の選択を待っています…';
      setMessage(`${head}\n${role}${act}`);
    });

    s.on('opponent-slot-count', ({ count }) => {
      setOpponentSlotCount(count);
      // ★ ここは isMyTurn の最新値で判定
      setPhase(prev => {
        if (!isMyTurnRef.current && prev === 'waiting') {
          setMessage(`相手が ${count} 枚出しました。同じ枚数を選んでください`);
          return 'submitting';
        }
        return prev;
      });
    });

    s.on('exchange-complete', ({ hand, opponentHand, opponentSlot, isMyTurn, turn }) => {
      // ① まず相手スロットを開示
      setOpponentSlot([...opponentSlot]);
      setIsRevealing(true);

      // ② 演出後に次ターンへ
      setTimeout(() => {
        setOpponentSlot([]);
        setIsRevealing(false);

        setHand([...hand].sort());
        setOppHand([...opponentHand].sort());
        setSelectedIndexes([]);
        setOpponentSlotCount(0);

        const nextTurn = turn + 1;
        if (nextTurn > 3) {
          const myScore = calculateScore(hand);
          const opScore = calculateScore(opponentHand);
          const resultText =
            myScore > opScore ? '勝ちました！' :
            myScore < opScore ? '負けました…' : '引き分けです！';
          setMessage(`ゲーム終了！${resultText}\nあなた: ${myScore}点　相手: ${opScore}点`);
          setPhase('done');
          return;
        }

        setTurnCount(nextTurn);
        setIsMyTurn(isMyTurn);
        setPhase(isMyTurn ? 'submitting' : 'waiting');

        const head = `第${nextTurn}ターン`;
        const role = isMyTurn ? '先攻です。' : '後攻です。';
        const act  = isMyTurn ? '1〜4枚カードを選んでください' : '相手の選択を待っています…';
        setMessage(`${head}\n${role}${act}`);
      }, 3000);
    });

    s.on('countdown-tick', ({ countdown }) => {
      setCountdown(countdown);

      // ★ 0秒 & 'submitting' なら自動提出
      if (countdown === 0 && phaseRef.current === 'submitting') {
        handleAutoSubmit();
      }
    });

    s.on('opponent-left', () => {
      setMessage('相手が離脱しました。ホームに戻ります');
      setTimeout(() => resetToHome(), 3000);
    });

    return () => s.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 自動提出（タイムアップ時）=====
  function handleAutoSubmit() {
    // phaseが変わっていたら何もしない
    if (phaseRef.current !== 'submitting') return;

    const selected = selectedRef.current;
    let selectedIndexesToSend = [...selected];

    if (isMyTurnRef.current) {
      // 先攻：未選択なら先頭2枚を自動選択
      if (selected.length === 0) {
        selectedIndexesToSend = [0, 1];
      }
      // 1〜4枚選ばれている場合はそのまま
    } else {
      // 後攻：相手の枚数に合わせる
      const required = opponentSlotCountRef.current;

      if (selected.length === required) {
        // そのまま
      } else if (selected.length < required) {
        // 不足分 → 未選択から補完
        const unselected = [...Array(6).keys()].filter(i => !selected.includes(i));
        const needed = required - selected.length;
        selectedIndexesToSend = [...selected, ...unselected.slice(0, needed)];
      } else if (selected.length > required) {
        // 多すぎ → 切り詰め
        selectedIndexesToSend = selected.slice(0, required);
      }
    }

    const slot = selectedIndexesToSend.map(i => handRef.current[i]);
    socket?.emit('submit-slot', { to: opponentIdRef.current, slot });
    setMessage(`${slot.length}枚を自動で交換スロットに出しました`);
    setPhase('waitingForOpponent');
  }

  // ====== 操作系 ======
  function startMatching() {
    socket?.emit('start-matching');
    setScene('waiting');
    setMessage('対戦相手を探しています…');
  }
  function cancelMatching() {
    socket?.emit('cancel-matching');
    resetToHome();
  }
  function leaveGame() {
    socket?.emit('leave-game');
    resetToHome();
  }
  function submitSlot() {
    const slot = selectedIndexes.map(i => hand[i]);
    socket?.emit('submit-slot', { to: opponentIdRef.current, slot });
    setMessage(`${slot.length}枚を交換スロットに出しました`);
    setPhase('waitingForOpponent');
  }
  function resetToHome() {
    setScene('home');
    setMessage('待機中…');
    setHand([]); setOppHand([]);
    setSelectedIndexes([]);
    setOpponentSlot([]); setOpponentSlotCount(0);
    setIsRevealing(false);
    setPhase('waiting');
    setTurnCount(1);
    setCountdown(30);
  }

  return {
    // state
    scene, message, hand, oppHand, selectedIndexes, setSelectedIndexes,
    opponentSlot, opponentSlotCount, isRevealing, phase, isMyTurn, turnCount, countdown,
    // actions
    startMatching, cancelMatching, leaveGame, submitSlot, resetToHome, setScene, setMessage,
  };
}
