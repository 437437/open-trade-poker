import React from 'react';
import { Text as RNText } from 'react-native';

export default function CustomText({ style, children, ...rest }) {
  return (
    <RNText style={[{ fontFamily: 'MPLUSRounded-Regular', marginHorizontal: 2 }, style]} {...rest}>
      {children}
    </RNText>
  );
}
