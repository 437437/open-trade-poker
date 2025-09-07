import React from 'react';
import { TouchableOpacity } from 'react-native';
import CustomText from './CustomText';

export default function CustomButton({ onPress, title, disabled, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          backgroundColor: disabled ? '#aaa' : '#007aff',
          paddingTop: 6, paddingBottom: 7, paddingHorizontal: 20,
          width: 200, borderRadius: 4, alignItems: 'center',
          alignSelf: 'center', marginVertical: 10,
        },
        style,
      ]}
    >
      <CustomText style={{ color: '#fff', fontSize: 16 }}>{title}</CustomText>
    </TouchableOpacity>
  );
}
