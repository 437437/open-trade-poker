// MessageBox.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import CustomText from './CustomText';
export default function MessageBox({ children }) {
  return (
    <View style={styles.box}>
      <CustomText style={{ fontSize: 16, lineHeight: 22 }}>{children}</CustomText>
    </View>
  );
}
const styles = StyleSheet.create({
  box: {
    backgroundColor: '#fff7e6', borderColor: '#ccc', borderWidth: 2, borderRadius: 6,
    padding: 8, minHeight: 60, marginBottom: 6, justifyContent: 'center',
  },
});
