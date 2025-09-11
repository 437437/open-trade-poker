// App.js
import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useFonts } from 'expo-font';
import Constants from 'expo-constants';
import TutorialModal from './TutorialModal';

import useOnlineGame from './hooks/useOnlineGame';
import OnlineGameScreen from './screens/OnlineGameScreen';
import CustomButton from './components/CustomButton';
import CustomText from './components/CustomText';

import useAIGame from './hooks/useAIGame';
import AIGameScreen from './screens/AIGameScreen';

import useLobbyStats from './hooks/useLobbyStats';
import LobbyInfo from './components/LobbyInfo';
import VersionModal from './components/VersionModal';

import usePresence from './hooks/usePresence';

const SERVER_URL = 'https://open-trade-poker-server.onrender.com';

export default function App() {
  // hooksは先頭に
  const [fontsLoaded] = useFonts({
    'MPLUSRounded-Bold': require('./assets/fonts/MPLUSRounded1c-Bold.ttf'),
    'MPLUSRounded-Regular': require('./assets/fonts/MPLUSRounded1c-Regular.ttf'),
  });

  const [scene, setScene] = useState('home'); // 'home' | 'ai' | 'online'
  const [showTutorial, setShowTutorial] = useState(false);
  const [showVersion, setShowVersion] = useState(false);

  const online = useOnlineGame(SERVER_URL);
  const ai = useAIGame();
  const { online: onlineCount, waiting, loading, isStale } = useLobbyStats(SERVER_URL);

  usePresence(SERVER_URL);

  // onlineフック側でhomeに戻したらApp側のsceneも同期
  useEffect(() => {
    if (scene === 'online' && online.scene === 'home') {
      setScene('home');
    }
  }, [scene, online.scene]);

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.wrapper} />
      </SafeAreaView>
    );
  }

  const appVersion =
    Constants?.expoConfig?.version || Constants?.manifest?.version || '0.0.0';

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
                online.startMatching();
                setScene('online');
              }}
            />

            {/* ホームのロビー人数 */}
            <LobbyInfo online={onlineCount} waiting={waiting} loading={loading} isStale={isStale} style={{ marginTop: 12 }} />
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
              waitElapsed: online.waitElapsed,
            }}
            actions={{
              setSelectedIndexes: online.setSelectedIndexes,
              submitSlot: online.submitSlot,
              cancelMatching: () => { online.cancelMatching(); setScene('home'); },
              leaveGame: () => { online.leaveGame(); setScene('home'); },
              startMatching: online.startMatching,
            }}
            lobby={{ online: onlineCount, waiting, loading, isStale }}
          />
        )}

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
              start: ai.start,
              setSelectedIndexes: ai.setSelectedIndexes,
              submitSlot: ai.submitSlot,
              leaveToHome: () => {
                ai.leaveToHome();
                setScene('home');
              },
            }}
            lobby={{ online: onlineCount, waiting, loading, isStale }}
          />
        )}

        {/* フッター：バージョン（ホーム画面のみ表示） */}
        {scene === 'home' && (
          <TouchableOpacity onPress={() => setShowVersion(true)} style={styles.versionTap}>
            <CustomText style={{ color: '#ccc', fontSize: 12 }}>
              v{appVersion}（タップで履歴）
            </CustomText>
          </TouchableOpacity>
        )}
      </View>

      <TutorialModal visible={showTutorial} onClose={() => setShowTutorial(false)} />
      <VersionModal visible={showVersion} onClose={() => setShowVersion(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2f4f4f', alignItems: 'center', justifyContent: 'center' },
  wrapper: {
    aspectRatio: 9 / 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '100%',
    borderRadius: 16,
    padding: 10,
    justifyContent: 'center',
    backgroundColor: '#2f4f4f',
  },
  versionTap: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    padding: 8,
  },
});
