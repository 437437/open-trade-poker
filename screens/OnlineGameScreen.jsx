import React from 'react';
import { View, Alert } from 'react-native';
import MessageBox from '../components/MessageBox';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import TopBar from '../components/TopBar';
import { SectionLabel, CardGrid, SlotGrid } from '../components/SlotGrid';

export default function OnlineGameScreen({
  state, actions,
}) {
  const {
    scene, message, countdown, hand, oppHand, selectedIndexes, opponentSlot,
    opponentSlotCount, isRevealing, phase, isMyTurn, turnCount,
  } = state;
  const { setSelectedIndexes, submitSlot, cancelMatching, leaveGame } = actions;

  const toggle = (i) => {
    if (phase !== 'submitting') return;
    setSelectedIndexes(prev => prev.includes(i)
      ? prev.filter(x => x !== i)
      : prev.length < 4 ? [...prev, i] : prev);
  };

  if (scene === 'waiting' || scene === 'matched') {
    return (
      <>
        <MessageBox>{message}</MessageBox>
        <CustomButton title="キャンセル" onPress={cancelMatching} />
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
      <SlotGrid
        revealed
        slot={selectedIndexes.map(i => hand[i])}
        count={selectedIndexes.length}
      />

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
