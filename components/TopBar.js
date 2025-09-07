// TopBar.js
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import CustomText from './CustomText';

export default function TopBar({ countdown, showQuit, onQuit, disabled }) {
  if (showQuit === false) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
      <CustomText style={{ fontSize: 24, color: '#fff', marginRight: 20, marginBottom: 10, opacity: disabled ? 0.4 : 1 }}>
        {countdown ?? '--'}s
      </CustomText>
      <TouchableOpacity onPress={onQuit} style={{ marginBottom: 10, marginRight: 4 }}>
        <FontAwesome5 name="sign-out-alt" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
