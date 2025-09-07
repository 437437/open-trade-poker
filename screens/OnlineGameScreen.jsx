// screens/OnlineGameScreen.jsx
import React from 'react';
import { View, Alert } from 'react-native';
import MessageBox from '../components/MessageBox';
import CustomButton from '../components/CustomButton';
import TopBar from '../components/TopBar';
import { SectionLabel, CardGrid, SlotGrid } from '../components/SlotGrid';
import LobbyInfo from '../components/LobbyInfo';
import CustomText from '../components/CustomText';

export default function OnlineGameScreen({ state, actions, lobby = { online: 0, waiting: 0 } }) {
  const {
    scene, message, countdown, hand, oppHand, selectedIndexes, opponentSlot,
    opponentSlotCount, isRevealing, phase, isMyTurn, waitElapsed, // ★ 追加
  } = state;
  const { setSelectedIndexes, submitSlot, cancelMatching, leaveGame } = actions;

  const toggle = (i) => {
    if (phase !== 'submitting') return;
    setSelectedIndexes(prev =>
      prev.includes(i) ? prev.filter(x => x !== i)
      : prev.length < 4 ? [...prev, i]
      : prev
    );
  };

  if (scene === 'waiting' || scene === 'matched') {
    return (
      <>
        <LobbyInfo online={lobby.online} waiting={lobby.waiting} style={{ marginBottom: 8 }} />
        <MessageBox>
          {message}
          {scene === 'waiting' && (
            <CustomText style={{ marginTop: 6 }}>
              経過 {waitElapsed}s / 60s
            </CustomText>
          )}
        </MessageBox>
        {scene === 'waiting' && (
          <CustomButton title="キャンセル" onPress={cancelMatching} />
        )}
      </>
    );
  }

  return (
    <View>
      {phase !== 'done' && (
        <TopBar
          countdown={countdown}
          onQuit={() => {
            Alert.alert('リタイアしますか？', '対戦を終了すると、負けになります。', [
              { text: 'キャンセル', style: 'cancel' },
              { text: '退出する', style: 'destructive', onPress: leaveGame },
            ]);
          }}
        />
      )}

      <MessageBox>{message}</MessageBox>

      <SectionLabel>相手の手札：</SectionLabel>
      <CardGrid cards={oppHand} />

      <SectionLabel>相手の交換スロット：</SectionLabel>
      <SlotGrid revealed={isRevealing} slot={opponentSlot} count={opponentSlotCount} />

      <SectionLabel>自分の交換スロット：</SectionLabel>
      <SlotGrid revealed slot={selectedIndexes.map(i => hand[i])} count={selectedIndexes.length} />

      <SectionLabel>自分の手札：</SectionLabel>
      <CardGrid cards={hand} selectable selectedIndexes={selectedIndexes} onToggle={toggle} />

      {phase !== 'done' ? (
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
      ) : (
        <CustomButton title="ホームに戻る" onPress={leaveGame} />
      )}
    </View>
  );
}
