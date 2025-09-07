// components/VersionModal.jsx
import React from 'react';
import { Modal, View, ScrollView, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import CustomText from './CustomText';
import CustomButton from './CustomButton';

const versionHistory = [
  {
    version: '1.1.0',
    date: '2025-09-07',
    changes: [
      'ロビー情報（オンライン人数・待機人数）を表示',
      'マッチング待機を60秒で自動キャンセルしてホームに戻るように変更',
      'AI対戦を途中終了できるように変更',
      '軽微なバグ修正',
    ],
  },
  {
    version: '1.0.0',
    date: '2025-09-05',
    changes: [
      '初回リリース',
    ],
  },
];

export default function VersionModal({ visible, onClose }) {
  const appVersion = Constants?.expoConfig?.version || Constants?.manifest?.version || '0.0.0';
  const year = new Date().getFullYear();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <CustomText style={styles.title}>バージョン履歴</CustomText>
          <CustomText style={styles.subtitle}>現在のバージョン: v{appVersion}</CustomText>

          <ScrollView style={{ maxHeight: 360 }}>
            {versionHistory.map((v) => (
              <View key={v.version} style={styles.item}>
                <CustomText style={styles.itemTitle}>v{v.version}（{v.date}）</CustomText>
                {v.changes.map((c, i) => (
                  <CustomText key={i} style={styles.bullet}>・{c}</CustomText>
                ))}
              </View>
            ))}
          </ScrollView>

          {/* 支援リンク */}
          <TouchableOpacity onPress={() => Linking.openURL('https://ko-fi.com/bluecopper_v')}>
            <CustomText style={styles.kofi}>
                ☕️ Support me on Ko-fi{'\n'}開発者にコーヒーを送って応援
            </CustomText>
          </TouchableOpacity>

          {/* 著作権表記 */}
          <CustomText style={styles.copyright}>
            © {year} Yuri Saito
          </CustomText>

          <CustomButton title="閉じる" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
    padding: 16,
  },
  panel: {
    width: '100%', maxWidth: 420,
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
  },
  title: { fontSize: 18, marginBottom: 6 },
  subtitle: { color: '#666', marginBottom: 8 },
  item: { marginBottom: 12 },
  itemTitle: { fontSize: 16, marginBottom: 6 },
  bullet: { color: '#333', lineHeight: 20 },
  kofi: { color: '#007aff', marginTop: 8, marginBottom: 4, textAlign: 'center' },
  copyright: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 12 },
});
