// components/Sections.jsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import CustomText from './CustomText';
import { getCardIcon, getCardBackIcon } from './CardIcon';
import { CARD_WIDTH, CARD_HEIGHT } from '../shared/layout';

export function SectionLabel({ children }) {
  return <CustomText style={{ marginTop: 12, color: '#fff' }}>{children}</CustomText>;
}

export function CardGrid({ cards, selectable = false, selectedIndexes = [], onToggle }) {
  return (
    <View style={styles.row}>
      {cards.map((card, i) => {
        const isSelected = selectedIndexes.includes(i);
        return selectable ? (
          <TouchableOpacity
            key={i}
            onPress={() => onToggle?.(i)}
            style={[
              styles.card,
              {
                borderColor: isSelected ? '#007aff' : '#333',
                backgroundColor: isSelected ? '#ddd' : '#fff',
              },
            ]}
          >
            {getCardIcon(card, CARD_WIDTH * 0.55)}
          </TouchableOpacity>
        ) : (
          <View key={i} style={[styles.card, { borderColor: '#999', backgroundColor: '#fff' }]}>
            {getCardIcon(card, CARD_WIDTH * 0.55)}
          </View>
        );
      })}
    </View>
  );
}

// 背景色だけ状態に応じて変える（ボーダーは固定）
const bgForSlot = (revealed, filled) => {
  if (!revealed) return filled ? '#9aa0a6' : '#e0e0e0'; // 未公開: 濃/薄グレー
  return filled ? '#ffffff' : '#f3f4f6';                // 公開後: 白/超薄グレー
};

/**
 * 4マス固定のスロット + 外枠トレイ
 * revealed=false → count分は濃いグレー背景＋鍵/？アイコン
 * revealed=true → カードは白、空枠は超薄グレー
 * ※ ボーダー色は常に固定
 */
export function SlotGrid({ revealed = false, slot = [], count = 0 }) {
  return (
    <View style={styles.tray}>
      <View style={styles.row}>
        {Array.from({ length: 4 }).map((_, i) => {
          const card = revealed ? slot[i] : null;
          const filled = revealed ? !!card : i < count;

          return (
            <View
              key={i}
              style={[
                styles.card,
                {
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  backgroundColor: bgForSlot(revealed, filled),
                  borderColor: '#666', // ← 固定
                },
              ]}
            >
              {revealed
                ? (card ? getCardIcon(card, CARD_WIDTH * 0.55) : null)
                : getCardBackIcon(filled, CARD_WIDTH * 0.55)}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#888',
    backgroundColor: '#e9e9e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 6,
    borderWidth: 2,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    // ※ 背景は inline で上書きするので固定しない
    // backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 2,
  },
});
