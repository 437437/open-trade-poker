// App.js
import React, { useState } from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import TutorialModal from './TutorialModal';

import useOnlineGame from './hooks/useOnlineGame'; 
import OnlineGameScreen from './screens/OnlineGameScreen';
import CustomButton from './components/CustomButton'; 
import CustomText from './components/CustomText';

import useAIGame from './hooks/useAIGame';
import AIGameScreen from './screens/AIGameScreen';

import useLobbyStats from './hooks/useLobbyStats'; 

const SERVER_URL = 'https://open-trade-poker-server.onrender.com';

export default function App() {
  // ✅ 1) すべての hook は無条件で先頭に並べる
  const [fontsLoaded] = useFonts({
    'MPLUSRounded-Bold': require('./assets/fonts/MPLUSRounded1c-Bold.ttf'),
    'MPLUSRounded-Regular': require('./assets/fonts/MPLUSRounded1c-Regular.ttf'),
  });

  const [scene, setScene] = useState('home'); // 'home' | 'ai' | 'online'
  const [showTutorial, setShowTutorial] = useState(false);

  const online = useOnlineGame(SERVER_URL);
  const ai = useAIGame();
  const { online: onlineCount, waiting } = useLobbyStats(SERVER_URL);

  // ✅ 2) フォント未ロード時の early return は「すべての hook のあと」でOK
  if (!fontsLoaded) {
    return <SafeAreaView style={styles.container}><View style={styles.wrapper} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrapper}>
        {scene === 'home' && (
          <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CustomText style={{ fontSize: 24, textAlign: 'center', marginBottom: 16, color: '#fff' }}>
              OPEN TRADE POKER
            </CustomText>
            <CustomButton title="遊び方を見る" onPress={() => setShowTutorial(true)} />
            <CustomButton title="AIと対戦" onPress={() => setScene('ai')} />
            <CustomButton
              title="マッチング対戦"
              onPress={() => {
                online.startMatching();   // ← ここでサーバへ start-matching を Emit
                setScene('online');       // 画面遷移
              }}
            />
            {/* ★ ロビー人数表示 */}
            <CustomText style={{ color:'#fff', marginBottom: 8 }}>
              オンライン: {onlineCount}　/　待機中: {waiting}
            </CustomText>
          </View>
        )}

        {scene === 'online' && (
          <OnlineGameScreen
            state={{
              scene: online.scene,
              message: online.message,
              countdown: online.countdown,
              hand: online.hand,
              oppHand: online.oppHand,
              selectedIndexes: online.selectedIndexes,
              opponentSlot: online.opponentSlot,
              opponentSlotCount: online.opponentSlotCount,
              isRevealing: online.isRevealing,
              phase: online.phase,
              isMyTurn: online.isMyTurn,
              turnCount: online.turnCount,
            }}
            actions={{
              setSelectedIndexes: online.setSelectedIndexes,
              submitSlot: online.submitSlot,
              cancelMatching: () => { online.cancelMatching(); setScene('home'); },
              leaveGame: () => { online.leaveGame(); setScene('home'); },
              startMatching: online.startMatching, // （保険で渡しておくと便利）
            }}
          />
        )}

        {/* AIモード */}
        {scene === 'ai' && (
          <AIGameScreen
            state={{
              scene: ai.scene,
              message: ai.message,
              hand: ai.hand,
              oppHand: ai.oppHand,
              selectedIndexes: ai.selectedIndexes,
              opponentSlot: ai.opponentSlot,
              opponentSlotCount: ai.opponentSlotCount,
              isRevealing: ai.isRevealing,
              phase: ai.phase,
              isMyTurn: ai.isMyTurn,
              turnCount: ai.turnCount,
            }}
            actions={{
              start: ai.start,                      // 「AI対戦を開始」ボタンで使う
              setSelectedIndexes: ai.setSelectedIndexes,
              submitSlot: ai.submitSlot,
              leaveToHome: () => { ai.leaveToHome(); setScene('home'); },
            }}
          />
        )}
      </View>

      <TutorialModal visible={showTutorial} onClose={() => setShowTutorial(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#2f4f4f', alignItems:'center', justifyContent:'center' },
  wrapper:{ aspectRatio:9/16, width:'100%', maxWidth:400, maxHeight:'100%', borderRadius:16, padding:10, justifyContent:'center', backgroundColor:'#2f4f4f' },
});
