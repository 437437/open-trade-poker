// screens/AIGameScreen.jsx
import React from 'react';
import MessageBox from '../components/MessageBox';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';
import TopBar from '../components/TopBar';
import { SectionLabel, CardGrid, SlotGrid } from '../components/SlotGrid';
import { View, Alert } from 'react-native';

export default function AIGameScreen({ state, actions }) {
  const {
    scene, message, hand, oppHand, selectedIndexes, opponentSlot,
    opponentSlotCount, isRevealing, phase, isMyTurn, turnCount,
  } = state;
  const { start, setSelectedIndexes, submitSlot, leaveToHome } = actions;

  const toggle = (i) => {
    if (phase !== 'submitting') return;
    setSelectedIndexes(prev => prev.includes(i)
      ? prev.filter(x => x !== i)
      : prev.length < 4 ? [...prev, i] : prev);
  };

  if (scene === 'idle') {
    return (
      <View>
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
      <MessageBox>{message}</MessageBox>

      <SectionLabel>AIの手札：</SectionLabel>
      <CardGrid cards={oppHand} />

      <SectionLabel>AIの交換スロット：</SectionLabel>
      <SlotGrid revealed={isRevealing} slot={opponentSlot} count={opponentSlotCount} />

      <SectionLabel>自分の交換スロット：</SectionLabel>
      <SlotGrid
        revealed
        slot={selectedIndexes.map(i => hand[i])}
        count={selectedIndexes.length}
      />

      <SectionLabel>自分の手札：</SectionLabel>
      <CardGrid
        cards={hand}
        selectable
        selectedIndexes={selectedIndexes}
        onToggle={toggle}
      />

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
