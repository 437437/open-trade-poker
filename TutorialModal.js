// TutorialModal.js
import React, { useEffect, useState } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
// ❌ これが循環の原因: import { CustomText } from './App'
// ✅ 独立した共通テキストを default import
import CustomText from './components/CustomText';

const screenWidth = Dimensions.get('window').width;
const wrapperWidth = Math.min(screenWidth, 400);

const PAGES = [
  {
    title: 'ゲームの目的',
    content:
      'OPEN TRADE POKERは、カードを交換しながら、できるだけ同じ種類のカードを揃えて高得点を目指すゲームです。\n\n両者の手札が見える状態で相手に渡すカードを選ぶ点に、戦略性があります。',
  },
  {
    title: 'カードの構成',
    content:
      '4種類×6枚の中から、ランダムに12枚が選ばれて使われます。各プレイヤーは常に6枚ずつの手札を持ちます。\n\n対戦ごとに盤面が変わるのが特徴です。',
  },
  {
    title: 'ターン進行',
    content:
      'ゲームは3ターン制。\n第1ターンはランダムな先攻。以降は交互に先攻・後攻が入れ替わります。',
  },
  {
    title: '1ターンの流れ',
    content:
      '交換は以下の流れで行います。\n\n【先攻】\n- 自分が相手に渡したいカードを1〜4枚選んで決定。\n\n【後攻】\n- 先攻が選んだカードと同じ枚数だけ選んで決定。\n\n後攻の決定が終わると、両者が選んだカードが開示され、交換成立。次ターンへ。',
  },
  {
    title: '30秒ルール',
    content:
      `決定ボタンを押さずに30秒経つと、自動でカードが提出されてしまいます。\n\n【先攻】\n- スロットにカードがあればそのまま提出\n- スロットのカードがない場合、手札の左から2枚を自動提出\n\n【後攻】\n- 先攻と同じ枚数になるよう、スロットのカードが足りなければ手札の左から補完して提出\n- 多い場合はスロットの左から必要枚数だけを提出`,
  },
  {
    title: '得点の仕組み',
    content:
      '最終的な手札で得点を計算します。同じ種類のカードを多く揃えるほど高得点となります。\n\n2枚：+2点\n3枚：+5点\n4枚：+10点\n5枚：+20点\n\n例えば、手札がハート2枚、リーフ4枚の場合、2+10=12点となります。',
  },
];

export default function TutorialModal({ visible, onClose }) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (visible) setPage(0);
  }, [visible]);

  const next = () => {
    if (page < PAGES.length - 1) setPage(page + 1);
    else onClose?.();
  };

  const prev = () => {
    if (page > 0) setPage(page - 1);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose} // iOSのスワイプ閉じる対応
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <CustomText style={styles.title}>{PAGES[page].title}</CustomText>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome5 name="times" size={20} color="#444" />
            </TouchableOpacity>
          </View>

          <CustomText style={styles.content}>{PAGES[page].content}</CustomText>

          {/* ページ送り */}
          <View style={styles.controls}>
            <TouchableOpacity onPress={prev} disabled={page === 0}>
              <FontAwesome5 name="arrow-left" size={20} color={page === 0 ? '#aaa' : '#007aff'} />
            </TouchableOpacity>

            <CustomText style={{ fontSize: 14 }}>{`${page + 1} / ${PAGES.length}`}</CustomText>

            <TouchableOpacity onPress={next}>
              <FontAwesome5 name="arrow-right" size={20} color="#007aff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // 半透明背景（見やすく）
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: wrapperWidth * 0.9,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    color: '#333',
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    color: '#444',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
