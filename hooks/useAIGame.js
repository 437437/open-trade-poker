// hooks/useAIGame.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadQTable } from '../ai/QLoader';
import { selectFromQ } from '../ai/aiBattleManager';

// 先後手（FSF）
function isPlayerTurnInFSS(turn, isPlayerFirst) {
  return (turn % 2 === 1) ? isPlayerFirst : !isPlayerFirst;
}
function removeExactCards(from, cardsToRemove) {
  const result = [...from];
  for (const card of cardsToRemove) {
    const idx = result.indexOf(card);
    if (idx !== -1) result.splice(idx, 1);
  }
  return result;
}
export function calculateScore(hand) {
  const types = ['A','B','C','D'];
  let score = 0;
  for (const t of types) {
    const c = hand.filter(x => x === t).length;
    if (c === 2) score += 2;
    else if (c === 3) score += 5;
    else if (c === 4) score += 10;
    else if (c === 5) score += 20;
  }
  return score;
}

export default function useAIGame() {
  // state
  const [scene, setScene] = useState('idle'); // 'idle' | 'playing' | 'done'
  const [message, setMessage] = useState('AI対戦を開始できます');
  const [hand, setHand] = useState([]);
  const [oppHand, setOppHand] = useState([]);
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [opponentSlot, setOpponentSlot] = useState([]);
  const [opponentSlotCount, setOpponentSlotCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const [phase, setPhase] = useState('waiting'); // 'waiting'|'submitting'|'thinking'|'done'
  const [turnCount, setTurnCount] = useState(1);
  const [isMyTurn, setIsMyTurn] = useState(false);

  const [isPlayerFirst, setIsPlayerFirst] = useState(null);
  const [aiQTable, setAiQTable] = useState(null);
  const [aiSlotReady, setAiSlotReady] = useState(false);
  const hasAITurnRun = useRef(false);

  // raw順序保持
  const [rawHand, setRawHand] = useState([]);
  const [rawOppHand, setRawOppHand] = useState([]);

  // refs
  const handRef = useRef([]); useEffect(()=>{ handRef.current = hand; },[hand]);
  const rawHandRef = useRef([]); useEffect(()=>{ rawHandRef.current = rawHand; },[rawHand]);
  const rawOppHandRef = useRef([]); useEffect(()=>{ rawOppHandRef.current = rawOppHand; },[rawOppHand]);
  const selectedRef = useRef([]); useEffect(()=>{ selectedRef.current = selectedIndexes; },[selectedIndexes]);

  // 洗牌
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i=a.length-1;i>0;i--) {
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  };

  // 開始
  const start = useCallback(() => {
    const isFirst = Math.random() < 0.5;
    setIsPlayerFirst(isFirst);
    const aiType = isFirst ? 'second' : 'first'; // プレイヤーが先攻ならAIは後攻
    const q = loadQTable(aiType);
    setAiQTable(q);

    const deck = shuffle(['A','A','A','A','A','A','B','B','B','B','B','B','C','C','C','C','C','C','D','D','D','D','D','D']);
    const pHand = deck.slice(0,6);
    const aHand = deck.slice(6,12);

    setRawHand(pHand);
    setRawOppHand(aHand);
    setHand([...pHand].sort());
    setOppHand([...aHand].sort());

    setTurnCount(1);
    setIsMyTurn(isFirst);
    setPhase(isFirst ? 'submitting' : 'waiting');
    setSelectedIndexes([]);
    setOpponentSlot([]); setOpponentSlotCount(0); setIsRevealing(false);
    setScene('playing');
    setMessage(`第1ターン\n${isFirst?'先攻です。':'後攻です。'}${isFirst?'1〜4枚選んでください':'AIの行動を待っています…'}`);
  }, []);

  const mySlot = useMemo(() => selectedIndexes.map(i => hand[i]), [selectedIndexes, hand]);

  // AI手番
  const handleAITurn = useCallback(() => {
    if (!aiQTable || turnCount > 3) return;

    setTimeout(() => {
      const mySlotNow = selectedRef.current.map(i => handRef.current[i]);
      const aiIsFirst = !isPlayerTurnInFSS(turnCount, isPlayerFirst);

      // 後攻AI：プレイヤー提出待ち（必要枚数が不明なので動かない）
      if (!aiIsFirst && mySlotNow.length === 0) return;

      const picked = selectFromQ(
        aiQTable,
        turnCount,
        rawOppHandRef.current,
        rawHandRef.current,
        aiIsFirst ? [] : mySlotNow,
        aiIsFirst
      );

      // 万一 null/空配列でも、ここまで来たら確実に出す（必要枚数はルール上確定済み）
      const need = aiIsFirst ? null : mySlotNow.length;
      const safeSlot = (Array.isArray(picked) && picked.length)
        ? picked
        : // フォールバック（先攻も後攻も確実に適正枚数で出す）
          (()=>{
            // 簡易版：相手に合わせた必要枚数で、手札から左詰め
            const h = [...rawOppHandRef.current];
            if (aiIsFirst) return h.slice(0, Math.min(4, h.length));
            const n = Math.max(1, Math.min(4, need || 1));
            return h.slice(0, Math.min(n, h.length));
          })();

      setOpponentSlotCount(safeSlot.length);
      setOpponentSlot([...safeSlot]);
      setAiSlotReady(true);

      if (aiIsFirst) {
        // 先攻AI：プレイヤーが同枚数を出すまで待つ
        setPhase('submitting');
        setMessage(`AIが ${safeSlot.length} 枚出しました。同じ枚数を選んでください`);
      } else {
        // 後攻AI：交換処理
        setTimeout(()=> {
          setIsRevealing(true);
          setTimeout(()=> {
            const newP = removeExactCards(handRef.current, mySlotNow).concat(safeSlot).sort();
            const newA = removeExactCards(oppHand, safeSlot).concat(mySlotNow).sort();

            // raw更新
            const newRawP = removeExactCards(rawHandRef.current, mySlotNow).concat(safeSlot);
            const newRawA = removeExactCards(rawOppHandRef.current, safeSlot).concat(mySlotNow);
            setRawHand(newRawP); setRawOppHand(newRawA);

            const next = turnCount + 1;
            if (next > 3) {
              const my = calculateScore(newP);
              const ai = calculateScore(newA);
              const msg = my>ai?'勝ちました！':my<ai?'負けました…':'引き分けです！';
              setHand(newP); setOppHand(newA);
              setSelectedIndexes([]); setOpponentSlotCount(0); setOpponentSlot([]);
              setIsRevealing(false); setTurnCount(next);
              setMessage(`ゲーム終了！${msg}\nあなた: ${my}点　AI: ${ai}点`);
              setPhase('done'); setScene('done');

              // ★ 次ターンへのフラグ持ち越し防止
              hasAITurnRun.current = false;
              setAiSlotReady(false);
            } else {
              const playerFirst = isPlayerTurnInFSS(next, isPlayerFirst);
              setHand(newP); setOppHand(newA);
              setSelectedIndexes([]); setOpponentSlotCount(0); setOpponentSlot([]);
              setIsRevealing(false); setTurnCount(next);
              setIsMyTurn(playerFirst);
              setPhase(playerFirst ? 'submitting' : 'waiting');
              setMessage(`第${next}ターン\n${playerFirst?'先攻です。':'後攻です。'}${playerFirst?'1〜4枚選んでください':'AIの行動を待っています…'}`);

              // ★ 次ターンへのフラグ持ち越し防止
              hasAITurnRun.current = false;
              setAiSlotReady(false);
            }
          }, 1200);
        }, 600);
      }
    }, 2000); // 演出ディレイ
  }, [aiQTable, turnCount, isPlayerFirst, oppHand]);

  // プレイヤー決定
  function submitSlot() {
    if (phase !== 'submitting') return;
    const playerWasFirst = isPlayerTurnInFSS(turnCount, isPlayerFirst);

    if (playerWasFirst) {
      setIsMyTurn(false);
      setPhase('thinking');
      setMessage('AIの行動を待っています…');
      handleAITurn();
    } else {
      if (!aiSlotReady) {
        setMessage('AIのカードがまだ決まっていません…');
        return;
      }
      doExchangeWithAI();
    }
  }

  function doExchangeWithAI() {
    setIsRevealing(true);
    const mySlotNow = selectedRef.current.map(i => handRef.current[i]);

    setTimeout(() => {
      const newP = removeExactCards(handRef.current, mySlotNow).concat(opponentSlot).sort();
      const newA = removeExactCards(oppHand, opponentSlot).concat(mySlotNow).sort();
      const newRawP = removeExactCards(rawHandRef.current, mySlotNow).concat(opponentSlot);
      const newRawA = removeExactCards(rawOppHandRef.current, opponentSlot).concat(mySlotNow);
      setRawHand(newRawP); setRawOppHand(newRawA);

      const next = turnCount + 1;

      // 次ターンへのフラグ持ち越し防止
      hasAITurnRun.current = false;
      setAiSlotReady(false);

      if (next > 3) {
        const my = calculateScore(newP);
        const ai = calculateScore(newA);
        const msg = my>ai?'勝ちました！':my<ai?'負けました…':'引き分けです！';
        setHand(newP); setOppHand(newA);
        setSelectedIndexes([]); setOpponentSlotCount(0);
        setMessage(`ゲーム終了！${msg}\nあなた: ${my}点　AI: ${ai}点`);
        setPhase('done'); setTurnCount(next); setScene('done');
      } else {
        setHand(newP); setOppHand(newA);
        setSelectedIndexes([]); setOpponentSlotCount(0);
        const playerFirst = isPlayerTurnInFSS(next, isPlayerFirst);
        setIsMyTurn(playerFirst);
        setPhase(playerFirst ? 'submitting' : 'waiting');
        setMessage(`第${next}ターン\n${playerFirst?'先攻です。':'後攻です。'}${playerFirst?'1〜4枚選んでください':'AIの行動を待っています…'}`);
        setTurnCount(next);
      }
      setIsRevealing(false);
      setOpponentSlot([]);
    }, 1200);
  }

  // 手番変化でAIを起動
  useEffect(() => {
    if (isPlayerFirst === null) return;
    if (!aiQTable) return;
    if (scene !== 'playing') return;
    const playerFirst = isPlayerTurnInFSS(turnCount, isPlayerFirst);
    const aiTurn = !playerFirst;

    // すでに動かした／スロット決定済みなら二重起動しない
    if (!aiTurn || hasAITurnRun.current || aiSlotReady) return;

    hasAITurnRun.current = true;
    handleAITurn();
  }, [phase, turnCount, aiQTable, isPlayerFirst, aiSlotReady, scene, handleAITurn]);

  return {
    // state
    scene, message, hand, oppHand, selectedIndexes, opponentSlot, opponentSlotCount,
    isRevealing, phase, isMyTurn, turnCount,
    // actions
    start,
    setSelectedIndexes,
    submitSlot,
    leaveToHome: () => {
      setScene('idle');
      setPhase('waiting');
      setMessage('AI対戦を開始できます');
      setHand([]); setOppHand([]);
      setSelectedIndexes([]); setOpponentSlot([]); setOpponentSlotCount(0);
      setTurnCount(1); setIsPlayerFirst(null);
      setAiQTable(null); setAiSlotReady(false); setIsRevealing(false);
      hasAITurnRun.current = false;
    },
  };
}
