// components/LobbyInfo.jsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import CustomText from './CustomText';

export default function LobbyInfo({ online=0, waiting=0, loading=false, isStale=false, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.pill}>
        <CustomText style={styles.text}>
          オンライン: {loading ? '取得中…' : `${online}${isStale ? ' ⟳' : ''}`}
        </CustomText>
      </View>
      <View style={styles.pill}>
        <CustomText style={styles.text}>
          待機中: {loading ? '取得中…' : `${waiting}${isStale ? ' ⟳' : ''}`}
        </CustomText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', flexDirection: 'row', gap: 8, marginBottom: 8 },
  pill: {
    backgroundColor: '#ffffff22',
    borderColor: '#ffffff44',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: { color: '#fff', fontSize: 12 },
});
