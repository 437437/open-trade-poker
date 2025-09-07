import React from 'react';
import { View } from 'react-native';
import CustomText from '../components/CustomText';
import CustomButton from '../components/CustomButton';

export default function HomeScreen({ onShowTutorial, onStartAI, onStartMatch }) {
  return (
    <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
      <CustomText style={{ fontSize: 24, textAlign: 'center', marginBottom: 16, color: '#fff' }}>
        OPEN TRADE POKER
      </CustomText>
      <CustomButton title="遊び方を見る" onPress={onShowTutorial} />
      <CustomButton title="AIと対戦" onPress={onStartAI} />
      <CustomButton title="マッチング対戦" onPress={onStartMatch} />
    </View>
  );
}
