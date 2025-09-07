import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { io } from 'socket.io-client';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Text as RNText } from 'react-native';
import { Alert } from 'react-native';
import TutorialModal from './TutorialModal';
import { loadQTable } from './ai/QLoader';
import { selectFromQ } from './ai/aiBattleManager';

const SERVER_URL = 'https://open-trade-poker-server.onrender.com'; // ← 環境に合わせて！

const CARD_ICONS = {
  A: { name: 'heart', color: '#e63946' },
  B: { name: 'snowflake', color: '#457b9d' },
  C: { name: 'leaf', color: '#2a9d8f' },
  D: { name: 'cloud', color: '#f4a261' },
};

export const CustomText = ({ style, children, ...rest }) => (
  <RNText style={[{ fontFamily: 'MPLUSRounded-Regular', marginHorizontal: 2 }, style]} {...rest}>
    {children}
  </RNText>
);

function removeExactCards(from, cardsToRemove) {
  const result = [...from];
  for (const card of cardsToRemove) {
    const index = result.indexOf(card);
    if (index !== -1) {
      result.splice(index, 1);
    }
  }
  return result;
}

// FSFルールに変更する
function isPlayerTurnInFSS(turn, isPlayerFirst) {
  return (turn % 2 === 1) ? isPlayerFirst : !isPlayerFirst;
}

const CustomButton = ({ onPress, title, disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[
      {
        backgroundColor: disabled ? '#aaa' : '#007aff',
        paddingTop: 6,
        paddingBottom: 7,
        paddingHorizontal: 20,
        width: 200,
        borderRadius: 4,
        alignItems: 'center',
        alignSelf: 'center',
        marginVertical: 10,
      },
    ]}
  >
    <CustomText style={{ color: '#fff', fontSize: 16 }}>
      {title}
    </CustomText>
  </TouchableOpacity>
);

function getCardIcon(type, size = 24) {
  const icon = CARD_ICONS[type];
  if (!icon) return <CustomText>?</CustomText>;
  return <FontAwesome5 name={icon.name} size={size} color={icon.color} solid />;
}

const screenWidth = Dimensions.get('window').width;
const wrapperWidth = Math.min(screenWidth, 400); // maxWidth: 400 に合わせる
const CARD_WIDTH = wrapperWidth / 8.5;
const CARD_HEIGHT = CARD_WIDTH * 1.33; // 比率維持（縦長に見せたい場合）

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2f4f4f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    aspectRatio: 9 / 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '100%',
    borderRadius: 16,
    padding: 10,
    justifyContent: 'center', 
    backgroundColor: '#2f4f4f',
    elevation: 3,
  },
  messageBox: {
    backgroundColor: '#fff7e6',
    borderColor: '#ccc',
    borderWidth: 2,
    borderRadius: 6,
    padding: 8,
    minHeight: 60,
    marginBottom: 6,
    justifyContent: 'center',
  },
  sectionBox: {
    backgroundColor: '#cacaca',
    borderColor: '#aaa',
    borderWidth: 1.5,
    borderRadius: 6,
    padding: 8,
    marginVertical: 6,
  },
  handSectionBox: {
    // backgroundColor: '#fff',
    borderColor: 'transparent', // 枠線なし
    borderWidth: 0,
    borderRadius: 6,
    paddingHorizontal: 8,
    marginVertical: 6,
  },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 4,
    borderWidth: 2,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    'MPLUSRounded-Bold': require('./assets/fonts/MPLUSRounded1c-Bold.ttf'),
    'MPLUSRounded-Regular': require('./assets/fonts/MPLUSRounded1c-Regular.ttf'),
  });

  const [socket, setSocket] = useState(null);
  const [scene, setScene] = useState('home'); // 'home' | 'waiting' | 'matched' | 'playing'
  const [preGameCountdown, setPreGameCountdown] = useState(3);

  const [matched, setMatched] = useState(false);
  const [opponentId, setOpponentId] = useState(null);
  const [message, setMessage] = useState('待機中…');

  const [hand, setHand] = useState([]);
  const [opponentHand, setOpponentHand] = useState([]);

  const [rawHand, setRawHand] = useState([]);        
  const [rawOppHand, setRawOppHand] = useState([]);

  const handRef = useRef([]);
  useEffect(() => { handRef.current = hand; }, [hand]);

  const rawHandRef = useRef([]);
  const rawOppHandRef = useRef([]);
  useEffect(() => { rawHandRef.current = rawHand; }, [rawHand]);
  useEffect(() => { rawOppHandRef.current = rawOppHand; }, [rawOppHand]);

  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [opponentSlotCount, setOpponentSlotCount] = useState(0);

  const [isMyTurn, setIsMyTurn] = useState(false);
  const [phase, setPhase] = useState('waiting');
  const [turnCount, setTurnCount] = useState(1);

  const [countdown, setCountdown] = useState(30);
  const opponentIdRef = useRef(null);

  const [opponentSlot, setOpponentSlot] = useState([]);
  const [isRevealing, setIsRevealing] = useState(false);

  const [showTutorial, setShowTutorial] = useState(false);

  const [isPlayerFirst, setIsPlayerFirst] = useState(null);
  const [aiQTable, setAiQTable] = useState(null);

  const hasAITurnRun = useRef(false);
  const [aiSlotReady, setAiSlotReady] = useState(false);

  const opponentSlotCountRef = useRef(0);
  useEffect(() => {
    opponentSlotCountRef.current = opponentSlotCount;
  }, [opponentSlotCount]);

  const selectedIndexesRef = useRef([]);
  useEffect(() => {
    selectedIndexesRef.current = selectedIndexes;
  }, [selectedIndexes]);

  const isMyTurnRef = useRef(false);
  useEffect(() => {
    isMyTurnRef.current = isMyTurn;
  }, [isMyTurn]);

  useEffect(() => {
    handRef.current = hand;
  }, [hand]);

  function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  const startAIBattle = async () => {
    const isFirst = Math.random() < 0.5;
    setIsPlayerFirst(isFirst);

    // Qテーブルのロード（AIの立場で）
    const aiType = isFirst ? 'second' : 'first'; // プレイヤーが先攻ならAIは後攻（second）
    const qTable = loadQTable(aiType);
    setAiQTable(qTable); // Qをセット

    // カード配布
    const deck = shuffle(['A','A','A','A','A','A','B','B','B','B','B','B','C','C','C','C','C','C','D','D','D','D','D','D']);
    const playerHand = deck.slice(0, 6);
    const aiHand = deck.slice(6, 12);
    setRawHand(playerHand);           // 生順
    setRawOppHand(aiHand);            // 生順
    setHand([...playerHand].sort());  // 表示用
    setOpponentHand([...aiHand].sort());

    setScene('ai'); // AI戦用画面に
    setTurnCount(1);
    setIsPlayerFirst(isFirst);
    setIsMyTurn(isFirst);
    setPhase(isFirst ? 'submitting' : 'waiting');
    setMessage(`第1ターン\n${isFirst ? '先攻です。' : '後攻です。'}${isFirst ? '1〜4枚選んでください' : 'AIの行動を待っています…'}`);
  };

  useEffect(() => {
    console.log('🔄 phase updated:', phase);
  }, [phase]);

  const handleAITurn = useCallback(() => {
    console.log('🧠 handleAITurn() called');
    if (!aiQTable || turnCount > 3) return;

    setTimeout(() => {
      const mySlotNow = selectedIndexesRef.current.map((i) => handRef.current[i]);
      const aiIsFirst = !isPlayerTurnInFSS(turnCount, isPlayerFirst); // ← AIが先攻か

      // 後攻なら、プレイヤーの提出が確定するまで待つ
      if (!aiIsFirst && mySlotNow.length === 0) {
        console.log('🛑 後攻AI: プレイヤー提出待ち（mySlotNowが空）');
        // プレイヤーの「決定」ボタン処理で再度 handleAITurn() を呼ぶようにしておく
        return;
      }

      // ここで初めて selectFromQ を呼ぶ（先攻/後攻で渡す引数を切り替え）
      const aiSlot = selectFromQ(
        aiQTable,
        turnCount,
        rawOppHandRef.current,   // ★ Ref から常に最新の raw
        rawHandRef.current,        // プレイヤーの手札
        aiIsFirst ? [] : mySlotNow,   // 後攻ならプレイヤー提出札
        aiIsFirst
      );

      setOpponentSlotCount(aiSlot.length);
      setOpponentSlot([...aiSlot]);
      setAiSlotReady(true);

      if (aiIsFirst) {
        console.log('🧠 AIは先攻（スロット提出して待機）');
        setPhase('submitting');
        setMessage(`AIが ${aiSlot.length} 枚出しました。同じ枚数を選んでください`);
      } else {
        console.log('🧠 AIは後攻（交換処理を開始）');
        setTimeout(() => {
          setIsRevealing(true);
          setTimeout(() => {
            const newPlayerHand = removeExactCards(handRef.current, mySlotNow).concat(aiSlot).sort();
            const newAIHand     = removeExactCards(opponentHand, aiSlot).concat(mySlotNow).sort();

            // ★ raw の更新（未ソートで順序保持）
            const newRawPlayer  = removeExactCards(rawHandRef.current, mySlotNow).concat(aiSlot);
            const newRawAI      = removeExactCards(rawOppHandRef.current, aiSlot).concat(mySlotNow);
            setRawHand(newRawPlayer);
            setRawOppHand(newRawAI);

            const nextTurn = turnCount + 1;
            if (nextTurn > 3) {
              const myScore = calculateScore(newPlayerHand);
              const aiScore = calculateScore(newAIHand);
              const resultText =
                myScore > aiScore ? '勝ちました！' :
                myScore < aiScore ? '負けました…' : '引き分けです！';

              setHand(newPlayerHand);
              setOpponentHand(newAIHand);
              setSelectedIndexes([]);
              setOpponentSlotCount(0);
              setOpponentSlot([]);
              setIsRevealing(false);
              setTurnCount(nextTurn);
              setMessage(`ゲーム終了！${resultText}\nあなた: ${myScore}点　AI: ${aiScore}点`);
              setPhase('done');
            } else {
              const playerGoesFirst = isPlayerTurnInFSS(nextTurn, isPlayerFirst);
              setHand(newPlayerHand);
              setOpponentHand(newAIHand);
              setSelectedIndexes([]);
              setOpponentSlotCount(0);
              setOpponentSlot([]);
              setIsRevealing(false);
              setTurnCount(nextTurn);
              setIsMyTurn(playerGoesFirst);
              setPhase(playerGoesFirst ? 'submitting' : 'waiting');
              setMessage(`第${nextTurn}ターン\n${playerGoesFirst ? '先攻です。' : '後攻です。'}${playerGoesFirst ? '1〜4枚選んでください' : 'AIの行動を待っています…'}`);
            }
          }, 2000);
        }, 1000);
      }
    }, 3100);
  }, [aiQTable, turnCount, isPlayerFirst]); 

  function doExchangeWithAI() {
    setIsRevealing(true);
    const mySlotNow = selectedIndexesRef.current.map((i) => handRef.current[i]);

    setTimeout(() => {
      const newPlayerHand = removeExactCards(handRef.current, mySlotNow).concat(opponentSlot).sort();
      const newAIHand = removeExactCards(opponentHand, opponentSlot).concat(mySlotNow).sort();

      // ★ raw も更新
      const newRawPlayer = removeExactCards(rawHandRef.current, mySlotNow).concat(opponentSlot);
      const newRawAI     = removeExactCards(rawOppHandRef.current, opponentSlot).concat(mySlotNow);
      setRawHand(newRawPlayer);
      setRawOppHand(newRawAI);

      const nextTurn = turnCount + 1;

      // ✅ フラグ類はここでリセットする！
      hasAITurnRun.current = false;
      setAiSlotReady(false);

      if (nextTurn > 3) {
        const myScore = calculateScore(newPlayerHand);
        const aiScore = calculateScore(newAIHand);
        const resultText =
          myScore > aiScore ? '勝ちました！' :
          myScore < aiScore ? '負けました…' :
          '引き分けです！';

        setHand(newPlayerHand);
        setOpponentHand(newAIHand);
        setSelectedIndexes([]);
        setOpponentSlotCount(0);
        setMessage(`ゲーム終了！${resultText}\nあなた: ${myScore}点　AI: ${aiScore}点`);
        setPhase('done');
        setTurnCount(nextTurn); // ✅ 最後にターン更新！
      } else {
        setHand(newPlayerHand);
        setOpponentHand(newAIHand);
        setSelectedIndexes([]);
        setOpponentSlotCount(0);

        const playerGoesFirst = isPlayerTurnInFSS(nextTurn, isPlayerFirst);
        setIsMyTurn(playerGoesFirst);
        setPhase(playerGoesFirst ? 'submitting' : 'waiting');
        setMessage(`第${nextTurn}ターン\n${playerGoesFirst ? '先攻です。' : '後攻です。'}${playerGoesFirst ? '1〜4枚選んでください' : 'AIの行動を待っています…'}`);

        setTurnCount(nextTurn); // ✅ これも最後！
      }

      setIsRevealing(false);
      setOpponentSlot([]);
    }, 2000);
  }

  const resetGameState = () => {
    setMatched(false);
    setOpponentId(null);
    setHand([]);
    setOpponentHand([]);
    setSelectedIndexes([]);
    setOpponentSlotCount(0);
    setIsMyTurn(false);
    setPhase('waiting');
    setTurnCount(1);
  };

  useEffect(() => {
    if (
      scene === 'ai' &&
      phase === 'waiting' &&
      aiQTable &&
      isPlayerFirst !== null &&
      (turnCount === 1 || turnCount === 2 || turnCount === 3) &&
      !isPlayerTurnInFSS(turnCount, isPlayerFirst) &&
      phase !== 'done' 
    ) {
      console.log('🧠 [AUTO-AI] forced trigger with delay');
      setTimeout(() => {
        handleAITurn();
      }, 0); 
    }
  }, [phase, turnCount, aiQTable, isPlayerFirst, scene]);

  const toggleCardInSlot = (index) => {
    if (phase !== 'submitting') return;
    setSelectedIndexes((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : prev.length < 4
        ? [...prev, index]
        : prev
    );
  };

  const submitSlot = () => {
    const slot = selectedIndexes.map((i) => hand[i]);

    if (scene === 'ai') {
      const playerWasFirst = isPlayerTurnInFSS(turnCount, isPlayerFirst);

      if (playerWasFirst) {
        console.log('[submitSlot] プレイヤー先攻。AIにバトンタッチ');
        setIsMyTurn(false);
        setPhase('thinking');
        setMessage('AIの行動を待っています…');
        handleAITurn();
      } else {
        if (!aiSlotReady) {
          console.warn('[submitSlot] opponentSlot未セット！AIのスロット提出を待ってください');
          setMessage('AIのカードがまだ決まっていません…');
          return;
        }
        console.log('[submitSlot] プレイヤー後攻。交換処理に入る');
        doExchangeWithAI();
      }
    } else {
      socket.emit('submit-slot', { to: opponentId, slot });
      setMessage(`${slot.length}枚を交換スロットに出しました`);
      setPhase('waitingForOpponent');
    }
  };

  const mySlot = useMemo(() => {
    return selectedIndexes.map((i) => hand[i]);
  }, [selectedIndexes, hand]);

  function calculateScore(hand) {
    const cardTypes = ['A', 'B', 'C', 'D'];
    let score = 0;
    for (const type of cardTypes) {
      const count = hand.filter((card) => card === type).length;
      if (count === 2) score += 2;
      else if (count === 3) score += 5;
      else if (count === 4) score += 10;
      else if (count === 5) score += 20;
    }
    return score;
  }

  function getCardBackIcon(filled, size = 20) {
    return filled
      ? <FontAwesome5 name="lock" size={size} color="#fff" solid />
      : <FontAwesome5 name="question" size={size} color="#999" solid />;
  }

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  
  useEffect(() => {
    if (isPlayerFirst === null) return;
    if (!aiQTable) return;
    if (scene !== 'ai') return;

    const playerGoesFirst = isPlayerTurnInFSS(turnCount, isPlayerFirst);
    const aiTurn = !playerGoesFirst;

    // phaseがsubmitting中とか、既にスロット出してるときは無視
    if (!aiTurn || hasAITurnRun.current || aiSlotReady) return;

    console.log('🧠 [AI ACTION] triggered by phase/turn change');
    hasAITurnRun.current = true;
    handleAITurn();
  }, [phase, turnCount, aiQTable, isPlayerFirst, aiSlotReady, scene]);

  useEffect(() => {
    if (!socket) return;

    const handleTick = ({ countdown }) => {
      console.log('⏱️ Countdown tick received:', countdown);
      setCountdown(countdown);
      if (countdown === 0 && phaseRef.current === 'submitting') {
        console.log('🧪 triggering auto-submit');
        handleAutoSubmit();
      }
    };

    socket.on('countdown-tick', handleTick);

    return () => {
      socket.off('countdown-tick', handleTick);
    };
  }, [socket]);

  useEffect(() => {
    if (phase === 'done') {
      const myScore = calculateScore(hand);
      const aiScore = calculateScore(opponentHand);
      const resultText =
        myScore > aiScore ? '勝ちました！' :
        myScore < aiScore ? '負けました…' :
        '引き分けです！';
      setMessage(`ゲーム終了！${resultText}\nあなた: ${myScore}点　AI: ${aiScore}点`);
    }
  }, [phase]);

  useEffect(() => {
    console.log('🧭 turnCount changed:', turnCount);
  }, [turnCount]);

  const handleAutoSubmit = () => {
    console.log('🧪 handleAutoSubmit triggered, phase:', phaseRef.current, 'isMyTurn:', isMyTurn);
    if (phaseRef.current !== 'submitting') return;

    const selected = selectedIndexesRef.current;
    let selectedIndexesToSend = [...selected];

    const isMyTurnNow = isMyTurnRef.current;
    if (isMyTurnNow) {
      if (selected.length === 0) {
        // 先攻で0枚なら先頭2枚を選ぶ
        selectedIndexesToSend = [0, 1];
      }
      // 1〜4枚選ばれていたらそのまま使う（今のままでOK）
    } else {
      const required = opponentSlotCountRef.current;

      if (selected.length === required) {
        // ちょうど必要枚数あればそのまま使う（何もしない）
      } else if (selected.length < required) {
        // 不足してたら未選択から補完
        const unselected = [...Array(6).keys()].filter(i => !selected.includes(i));
        const needed = required - selected.length;
        selectedIndexesToSend = [...selected, ...unselected.slice(0, needed)];
      } else if (selected.length > required) {
        // 多かったら切り捨て
        selectedIndexesToSend = selected.slice(0, required);
      }
    }

    const autoSlot = selectedIndexesToSend.map(i => handRef.current[i]);

    console.log('🧪 emitting submit-slot from:', socket?.id);
    console.log('🧪 opponentId:', opponentIdRef.current);
    console.log('🧪 selectedIndexes:', selectedIndexesToSend);
    console.log('🧪 autoSlot:', autoSlot);

    socket.emit('submit-slot', { to: opponentIdRef.current, slot: autoSlot });
    setMessage(`${autoSlot.length}枚を自動で交換スロットに出しました`);
    setPhase('waitingForOpponent');
  };

  useEffect(() => {
    hasAITurnRun.current = false;
  }, [turnCount]);

  useEffect(() => {
    if (scene === 'ai') return;
    const s = io(SERVER_URL, { transports: ['websocket'] });
    setSocket(s);

    s.on('connect', () => console.log('✅ Connected to server'));

    s.on('match', ({ opponentId }) => {
      setOpponentId(opponentId);
      opponentIdRef.current = opponentId; 

      setScene('matched'); 
      setPreGameCountdown(3);
      setMessage(`対戦相手が見つかりました！\nゲーム開始まで... 3`);
      
      // 3,2,1のカウントダウンを更新
      const timer = setInterval(() => {
        setPreGameCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          setMessage(`対戦相手が見つかりました！\nゲーム開始まで... ${prev - 1}`);
          return prev - 1;
        });
      }, 1000);
    });

    s.on('start-game', (data) => {
      // 3秒後にsceneを切り替えてカード表示
      setTimeout(() => {
        setScene('playing');
        setTurnCount(1);
        setHand([...data.hand].sort());
        setOpponentHand([...data.opponentHand].sort());
        setIsMyTurn(data.first);
        setPhase(data.first ? 'submitting' : 'waiting');

        const turnText = '第1ターン';
        const roleText = data.first ? '先攻です。' : '後攻です。';
        const actionText = data.first ? '1〜4枚カードを選んでください' : '相手の選択を待っています…';
        setMessage(`${turnText}\n${roleText}${actionText}`);
      }, 0); // ← カウントダウン分だけ待つ
    });

    s.on('opponent-slot-count', ({ count }) => {
      setOpponentSlotCount(count);
      setPhase((prevPhase) => {
        if (!isMyTurn && prevPhase === 'waiting') {
          setMessage(`相手が ${count} 枚出しました。同じ枚数を選んでください`);
          return 'submitting';
        }
        return prevPhase;
      });
    });

    s.on('exchange-complete', ({ hand, opponentHand, opponentSlot, isMyTurn, turn }) => {
      // ① まずスロットを開示
      setOpponentSlot([...opponentSlot]);
      setIsRevealing(true);

      // ② 2秒後に次のターンへ
      setTimeout(() => {
        setOpponentSlot([]);
        setIsRevealing(false);

        setHand([...hand].sort());
        setOpponentHand([...opponentHand].sort());
        setSelectedIndexes([]);
        setOpponentSlotCount(0);

        const nextTurn = turn + 1;
        if (nextTurn > 3) {
          const myScore = calculateScore(hand);
          const opponentScore = calculateScore(opponentHand);
          let resultText = '';
          if (myScore > opponentScore) resultText = '勝ちました！';
          else if (myScore < opponentScore) resultText = '負けました…';
          else resultText = '引き分けです！';

          setMessage(`ゲーム終了！${resultText}\nあなた: ${myScore}点　相手: ${opponentScore}点`);
          setPhase('done');
          return;
        }

        setTurnCount(nextTurn);
        setIsMyTurn(isMyTurn);
        setPhase(isMyTurn ? 'submitting' : 'waiting');

        const turnText = `第${nextTurn}ターン`;
        const roleText = isMyTurn ? '先攻です。' : '後攻です。';
        const actionText = isMyTurn ? '1〜4枚カードを選んでください' : '相手の選択を待っています…';
        setMessage(`${turnText}\n${roleText}${actionText}`);
      }, 3000);
    });

    s.on('opponent-left', () => {
      setMessage('相手が離脱しました。ホームに戻ります');
      // 3秒後にホームに戻す
      setTimeout(() => {
        resetGameState();
        setScene('home');
      }, 3000);
    });

    return () => s.disconnect();
  }, []);

    return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentWrapper}>
        {scene === 'home' && (
          <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CustomText style={{ fontSize: 24, textAlign: 'center', marginBottom: 16, color: '#fff' }}>
              OPEN TRADE POKER
            </CustomText>
            <CustomButton title="遊び方を見る" onPress={() => setShowTutorial(true)} />
            <CustomButton
              title="AIと対戦"
              onPress={() => {
                startAIBattle(); // AI戦ロジック起動
              }}
            />
            <CustomButton
              title="マッチング対戦"
              onPress={() => {
                if (socket) socket.emit('start-matching');
                setScene('waiting');
                setMessage('対戦相手を探しています…');
              }}
            />
          </View>
        )}

        {scene === 'waiting' && (
          <>
            <View style={styles.messageBox}>
              <CustomText style={{ fontSize: 16, lineHeight: 22 }}>{message}</CustomText>
            </View>
            <CustomButton
              title="キャンセル"
              onPress={() => {
                if (socket) socket.emit('cancel-matching');
                resetGameState();
                setScene('home');
              }}
            />
          </>
        )}

        {scene === 'matched' && (
          <View style={styles.messageBox}>
            <CustomText style={{ fontSize: 16, lineHeight: 22 }}>
              {message}
            </CustomText>
          </View>
        )}

        {scene === 'playing' && (
          <View>

            {phase !== 'done' && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                <CustomText
                  style={{
                    fontSize: 24,
                    color: '#fff',
                    marginRight: 20,
                    marginBottom: 10,
                    opacity: phase === 'submitting' ? 1 : 0.4,
                  }}
                >
                  {countdown ?? '--'}s
                </CustomText>

                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'リタイアしますか？',
                      '対戦を終了すると、負けになります。',
                      [
                        { text: 'キャンセル', style: 'cancel' },
                        {
                          text: '退出する',
                          style: 'destructive',
                          onPress: () => {
                            if (socket) socket.emit('leave-game');
                            resetGameState();
                            setScene('home');
                          },
                        },
                      ]
                    );
                  }}
                  style={{
                    marginBottom: 10,
                    marginRight: 4,
                  }}
                >
                  <FontAwesome5 name="sign-out-alt" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.messageBox}>
              <CustomText style={{ fontSize: 16, lineHeight: 22 }}>{message}</CustomText>
            </View>

            {/* ラベルを外に出す */}
            <CustomText style={{ marginTop: 12, color: '#fff' }}>
              相手の手札：
            </CustomText>

            <View style={styles.handSectionBox}>
              <View style={styles.cardRow}>
                {opponentHand.map((card, i) => (
                  <View
                    key={i}
                    style={[
                      styles.card,
                      { borderColor: '#999', width: CARD_WIDTH, height: CARD_HEIGHT },
                    ]}
                  >
                    {getCardIcon(card, CARD_WIDTH * 0.55)}
                  </View>
                ))}
              </View>
            </View>

            <CustomText style={{ marginTop: 12, color: '#fff' }}>
              相手の交換スロット：
            </CustomText>

            <View style={styles.sectionBox}>
              <View style={styles.cardRow}>
                {Array.from({ length: 4 }).map((_, i) => {
                  const card = isRevealing ? opponentSlot[i] : null;
                  const filled = isRevealing ? !!card : i < opponentSlotCount;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.card,
                        {
                          backgroundColor: filled ? '#aaa' : '#eee',
                          borderColor: filled ? '#555' : '#ccc',
                          width: CARD_WIDTH,
                          height: CARD_HEIGHT,
                        },
                      ]}
                    >
                      {isRevealing
                        ? card
                          ? getCardIcon(card, CARD_WIDTH * 0.55)
                          : null
                        : getCardBackIcon(filled, CARD_WIDTH * 0.55)}
                    </View>
                  );
                })}
              </View>
            </View>

            <CustomText style={{ marginTop: 12, color: '#fff' }}>
              自分の交換スロット：
            </CustomText>

            <View style={styles.sectionBox}>
              <View style={styles.cardRow}>
                {Array.from({ length: 4 }).map((_, i) => {
                  const card = mySlot[i];
                  return (
                    <View
                      key={i}
                      style={[
                        styles.card,
                        {
                          borderColor: '#333',
                          backgroundColor: '#fff',
                          opacity: card ? 1 : 0.3,
                          width: CARD_WIDTH,
                          height: CARD_HEIGHT,
                        },
                      ]}
                    >
                      {card ? getCardIcon(card, CARD_WIDTH * 0.55) : null}
                    </View>
                  );
                })}
              </View>
            </View>

            <CustomText style={{ marginTop: 12, color: '#fff' }}>
              自分の手札：
            </CustomText>

            <View style={styles.handSectionBox}>
              <View style={styles.cardRow}>
                {hand.map((card, index) => {
                  const isSelected = selectedIndexes.includes(index);
                  const isDisabled = phase !== 'submitting';
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => toggleCardInSlot(index)}
                      disabled={isDisabled}
                      style={[
                        styles.card,
                        {
                          borderColor: isSelected ? '#007aff' : '#333',
                          backgroundColor: isSelected ? '#e6f0ff' : '#fff',
                          width: CARD_WIDTH,
                          height: CARD_HEIGHT,
                        },
                      ]}
                    >
                      {getCardIcon(card, CARD_WIDTH * 0.55)}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {phase !== 'done' && (
              <View>
                <CustomButton
                  title="決定"
                  onPress={submitSlot}
                  disabled={
                    phase !== 'submitting' ||
                    selectedIndexes.length === 0 ||
                    selectedIndexes.length > 4 ||
                    (!isMyTurn && selectedIndexes.length !== opponentSlotCount)
                  }
                />
              </View>
            )}

            {phase === 'done' && (
              <CustomButton
                title="ホームに戻る"
                onPress={() => {
                  resetGameState();
                  setScene('home');
                }}
              />
            )}
          </View>
        )}

        {scene === 'ai' && (
          <View>
            {/* ターン・指示・結果などのメッセージ */}
            <View style={styles.messageBox}>
              <CustomText style={{ fontSize: 16, lineHeight: 22 }}>{message}</CustomText>
            </View>

            {/* 相手（AI）の手札 */}
            <CustomText style={{ marginTop: 12, color: '#fff' }}>
              AIの手札：
            </CustomText>
            <View style={styles.handSectionBox}>
              <View style={styles.cardRow}>
                {opponentHand.map((card, i) => (
                  <View
                    key={i}
                    style={[
                      styles.card,
                      { borderColor: '#999', width: CARD_WIDTH, height: CARD_HEIGHT },
                    ]}
                  >
                    {getCardIcon(card, CARD_WIDTH * 0.55)}
                  </View>
                ))}
              </View>
            </View>

            {/* AIの交換スロット */}
            <CustomText style={{ marginTop: 12, color: '#fff' }}>
              AIの交換スロット：
            </CustomText>
            <View style={styles.sectionBox}>
              <View style={styles.cardRow}>
                {Array.from({ length: 4 }).map((_, i) => {
                  const card = isRevealing ? opponentSlot[i] : null;
                  const filled = isRevealing ? !!card : i < opponentSlotCount;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.card,
                        {
                          backgroundColor: filled ? '#aaa' : '#eee',
                          borderColor: filled ? '#555' : '#ccc',
                          width: CARD_WIDTH,
                          height: CARD_HEIGHT,
                        },
                      ]}
                    >
                      {isRevealing
                        ? card
                          ? getCardIcon(card, CARD_WIDTH * 0.55)
                          : null
                        : getCardBackIcon(filled, CARD_WIDTH * 0.55)}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 自分の交換スロット */}
            <CustomText style={{ marginTop: 12, color: '#fff' }}>
              自分の交換スロット：
            </CustomText>
            <View style={styles.sectionBox}>
              <View style={styles.cardRow}>
                {Array.from({ length: 4 }).map((_, i) => {
                  const card = mySlot[i];
                  return (
                    <View
                      key={i}
                      style={[
                        styles.card,
                        {
                          borderColor: '#333',
                          backgroundColor: '#fff',
                          opacity: card ? 1 : 0.3,
                          width: CARD_WIDTH,
                          height: CARD_HEIGHT,
                        },
                      ]}
                    >
                      {card ? getCardIcon(card, CARD_WIDTH * 0.55) : null}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 自分の手札 */}
            <CustomText style={{ marginTop: 12, color: '#fff' }}>
              自分の手札：
            </CustomText>
            <View style={styles.handSectionBox}>
              <View style={styles.cardRow}>
                {hand.map((card, index) => {
                  const isSelected = selectedIndexes.includes(index);
                  const isDisabled = phase !== 'submitting';
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => toggleCardInSlot(index)}
                      disabled={isDisabled}
                      style={[
                        styles.card,
                        {
                          borderColor: isSelected ? '#007aff' : '#333',
                          backgroundColor: isSelected ? '#e6f0ff' : '#fff',
                          width: CARD_WIDTH,
                          height: CARD_HEIGHT,
                        },
                      ]}
                    >
                      {getCardIcon(card, CARD_WIDTH * 0.55)}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 決定ボタン（自分が先攻 or 後攻でスロット選ぶとき） */}
            {phase !== 'done' && (
              <CustomButton
                title="決定"
                onPress={() => submitSlot()}
                disabled={
                  phase !== 'submitting' ||
                  phase === 'thinking' || 
                  selectedIndexes.length === 0 ||
                  selectedIndexes.length > 4 ||
                  (!isMyTurn && selectedIndexes.length !== opponentSlotCount)
                }
              />
            )}

            {/* 終了後 */}
            {phase === 'done' && (
              <CustomButton
                title="ホームに戻る"
                onPress={() => {
                  resetGameState();
                  setScene('home');
                }}
              />
            )}
          </View>
        )}
      </View>

      <TutorialModal visible={showTutorial} onClose={() => setShowTutorial(false)} />
    </SafeAreaView>
  );
}