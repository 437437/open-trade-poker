// hooks/useOnlineGame.js
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getSocket } from '../lib/socket';
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

  // 待機の経過秒
  const [waitElapsed, setWaitElapsed] = useState(0);
  const returnTimerRef = useRef(null);
  const opponentIdRef = useRef(null);

  // refs（イベント内から最新値を読むため）
  const phaseRef = useRef(phase);             useEffect(()=>{ phaseRef.current = phase; }, [phase]);
  const isMyTurnRef = useRef(isMyTurn);       useEffect(()=>{ isMyTurnRef.current = isMyTurn; }, [isMyTurn]);
  const selectedRef = useRef(selectedIndexes);useEffect(()=>{ selectedRef.current = selectedIndexes; }, [selectedIndexes]);
  const handRef = useRef(hand);               useEffect(()=>{ handRef.current = hand; }, [hand]);
  const opponentSlotCountRef = useRef(opponentSlotCount);
  useEffect(()=>{ opponentSlotCountRef.current = opponentSlotCount; }, [opponentSlotCount]);

  // ===== ソケット接続（共有インスタンス使用）=====
  useEffect(() => {
    const s = getSocket(SERVER_URL);
    setSocket(s);

    const onConnect = () => {
      console.log('✅ Connected');
    };

    const onMatch = ({ opponentId }) => {
      opponentIdRef.current = opponentId;
      setScene('matched');
      setPreGameCountdown(3);
      setMessage(`対戦相手が見つかりました！\nゲーム開始まで... 3`);

      // 3,2,1 カウントダウン
      const start = Date.now();
      const timer = setInterval(() => {
        setPreGameCountdown(prev => {
          const next = prev - 1;
          if (next <= 0) {
            clearInterval(timer);
            return 0;
          }
          setMessage(`対戦相手が見つかりました！\nゲーム開始まで... ${next}`);
          return next;
        });
      }, 1000);

      // 念のため、unmount時に止める
      const clearCountdown = () => clearInterval(timer);
      // この effect の cleanup で実行されるように返す
      onMatch._cleanup = clearCountdown;
    };

    const onStartGame = (data) => {
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
    };

    const onOppSlotCount = ({ count }) => {
      setOpponentSlotCount(count);
      setPhase(prev => {
        if (!isMyTurnRef.current && prev === 'waiting') {
          setMessage(`相手が ${count} 枚出しました。同じ枚数を選んでください`);
          return 'submitting';
        }
        return prev;
      });
    };

    const onExchange = ({ hand, opponentHand, opponentSlot, isMyTurn, turn }) => {
      setOpponentSlot([...opponentSlot]);
      setIsRevealing(true);

      const t = setTimeout(() => {
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

      onExchange._cleanup = () => clearTimeout(t);
    };

    const onTick = ({ countdown }) => {
      setCountdown(countdown);
      if (countdown === 0 && phaseRef.current === 'submitting') {
        handleAutoSubmit();
      }
    };

    const onOpponentLeft = () => {
      setMessage('相手が離脱しました。ホームに戻ります');
      const t = setTimeout(() => resetToHome(), 3000);
      onOpponentLeft._cleanup = () => clearTimeout(t);
    };

    // ここで購読
    s.on('connect', onConnect);
    s.on('match', onMatch);
    s.on('start-game', onStartGame);
    s.on('opponent-slot-count', onOppSlotCount);
    s.on('exchange-complete', onExchange);
    s.on('countdown-tick', onTick);
    s.on('opponent-left', onOpponentLeft);

    // cleanup: 共有ソケットなので disconnect はしない。listener だけ外す。
    return () => {
      s.off('connect', onConnect);
      s.off('match', onMatch);
      s.off('start-game', onStartGame);
      s.off('opponent-slot-count', onOppSlotCount);
      s.off('exchange-complete', onExchange);
      s.off('countdown-tick', onTick);
      s.off('opponent-left', onOpponentLeft);

      // 各イベント内で仕込んだタイマーの掃除
      onMatch._cleanup?.();
      onExchange._cleanup?.();
      onOpponentLeft._cleanup?.();
    };
  }, [SERVER_URL]);

  function returnToHomeWithDelay(msg, ms = 3000) {
    if (returnTimerRef.current) {
      clearTimeout(returnTimerRef.current);
      returnTimerRef.current = null;
    }
    setMessage(msg);
    returnTimerRef.current = setTimeout(() => {
      resetToHome();
      returnTimerRef.current = null;
    }, ms);
  }

  // バックグラウンドで自動キャンセル
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        if (scene === 'waiting' || scene === 'matched') {
          socket?.emit('cancel-matching');
          returnToHomeWithDelay('バックグラウンドに移動したため待機を終了します', 3000);
        }
      }
    });
    return () => sub.remove();
  }, [scene, socket]);

  // 待機中の経過秒カウント（0→60）＆自動リターン
  useEffect(() => {
    if (scene !== 'waiting') return;
    setWaitElapsed(0);
    const timer = setInterval(() => {
      setWaitElapsed((sec) => {
        if (sec >= 59) {
          clearInterval(timer);
          socket?.emit('cancel-matching');
          returnToHomeWithDelay('長時間マッチングしなかったためホームに戻ります', 3000);
          return 60;
        }
        return sec + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [scene, socket]);

  useEffect(() => {
    return () => {
      if (returnTimerRef.current) {
        clearTimeout(returnTimerRef.current);
        returnTimerRef.current = null;
      }
    };
  }, []);

  // ===== 自動提出（タイムアップ時）=====
  function handleAutoSubmit() {
    if (phaseRef.current !== 'submitting') return;

    const selected = selectedRef.current;
    let selectedIndexesToSend = [...selected];

    if (isMyTurnRef.current) {
      if (selected.length === 0) selectedIndexesToSend = [0, 1];
    } else {
      const required = opponentSlotCountRef.current;
      if (selected.length < required) {
        const unselected = [...Array(6).keys()].filter(i => !selected.includes(i));
        const needed = required - selected.length;
        selectedIndexesToSend = [...selected, ...unselected.slice(0, needed)];
      } else if (selected.length > required) {
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
    setWaitElapsed(0);
  }
  function cancelMatching() {
    if (scene === 'waiting') {
      socket?.emit('cancel-matching');
      resetToHome();
    }
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
    if (returnTimerRef.current) {
      clearTimeout(returnTimerRef.current);
      returnTimerRef.current = null;
    }
    opponentIdRef.current = null;

    setScene('home');
    setHand([]); setOppHand([]);
    setSelectedIndexes([]);
    setOpponentSlot([]); setOpponentSlotCount(0);
    setIsRevealing(false);
    setPhase('waiting');
    setTurnCount(1);
    setCountdown(30);
    setWaitElapsed(0);
  }

  return {
    // state
    scene, message, hand, oppHand, selectedIndexes, setSelectedIndexes,
    opponentSlot, opponentSlotCount, isRevealing, phase, isMyTurn, turnCount, countdown,
    waitElapsed,
    // actions
    startMatching, cancelMatching, leaveGame, submitSlot, resetToHome, setScene, setMessage,
  };
}
