// screens/AIGameScreen.jsx
import React from 'react';
import { View, Alert } from 'react-native';
import MessageBox from '../components/MessageBox';
import CustomButton from '../components/CustomButton';
import TopBar from '../components/TopBar';
// ✅ ここは SlotGrid に統一
import { SectionLabel, CardGrid, SlotGrid } from '../components/SlotGrid';
import LobbyInfo from '../components/LobbyInfo';

export default function AIGameScreen({ state, actions, lobby = { online: 0, waiting: 0 } }) {
  const {
    scene, message, hand, oppHand, selectedIndexes, opponentSlot,
    opponentSlotCount, isRevealing, phase, isMyTurn,
  } = state;
  const { start, setSelectedIndexes, submitSlot, leaveToHome } = actions;

  const toggle = (i) => {
    if (phase !== 'submitting') return;
    setSelectedIndexes(prev =>
      prev.includes(i) ? prev.filter(x => x !== i)
      : prev.length < 4 ? [...prev, i]
      : prev
    );
  };

  if (scene === 'idle') {
    return (
      <View>
        <LobbyInfo online={lobby.online} waiting={lobby.waiting} style={{ marginBottom: 8 }} />
        <MessageBox>{message}</MessageBox>
        <CustomButton title="AI対戦を開始" onPress={start} />
        <CustomButton title="ホームに戻る" onPress={leaveToHome} />
      </View>
    );
  }

  return (
    <View>
      <TopBar
        onQuit={() => {
          Alert.alert(
            '対戦を終了しますか？',
            'AI対戦を終了してホームに戻ります。',
            [
              { text: 'キャンセル', style: 'cancel' },
              { text: '終了する', style: 'destructive', onPress: leaveToHome },
            ]
          );
        }}
      />

      <LobbyInfo online={lobby.online} waiting={lobby.waiting} style={{ marginBottom: 6 }} />

      <MessageBox>{message}</MessageBox>
      {/* ✅ 対戦中も表示 */}

      <SectionLabel>AIの手札：</SectionLabel>
      <CardGrid cards={oppHand} />

      <SectionLabel>AIの交換スロット：</SectionLabel>
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
        <CustomButton title="ホームに戻る" onPress={leaveToHome} />
      )}
    </View>
  );
}