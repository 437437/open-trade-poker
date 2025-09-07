// aiUtils.js など（このファイル単体で完結）
const CARD_TYPES = 'ABCD';

// === vec helpers ===
export function handToVec(hand) {
  const v = [0, 0, 0, 0];
  for (const c of hand || []) {
    const i = CARD_TYPES.indexOf(c);
    if (i >= 0) v[i]++;
  }
  return v;
}

export const slotToVec = handToVec;

// === Python repr helpers ===
function pyBool(b) { return b ? 'True' : 'False'; }
function pyTuple(items) { return '(' + items.join(', ') + ')'; }
const vecStr = v => pyTuple(v.map(n => String(n)));

// === 最頻カード index（同数なら A→B→C→D 優先）
function argmaxCountIndex(hand = [], oppHand = []) {
  const all = [...hand, ...oppHand];     // ← 学習時と同じ連結順
  const counts = [0, 0, 0, 0];
  for (const c of all) {
    const i = CARD_TYPES.indexOf(c);
    if (i >= 0) counts[i]++;
  }
  // 同数なら「all の中で先に出現したほう」を優先（Pythonの most_common タイブレーク再現）
  let bestI = -1, bestC = -1, bestFirstPos = Infinity;
  for (let i = 0; i < 4; i++) {
    const c = counts[i];
    if (c === 0) continue;
    const firstPos = all.indexOf(CARD_TYPES[i]); // 初出位置
    if (c > bestC || (c === bestC && firstPos < bestFirstPos)) {
      bestC = c;
      bestI = i;
      bestFirstPos = firstPos;
    }
  }
  return bestI === -1 ? 0 : bestI; // 全0は一応 A=0 にフォールバック
}

// === 学習時キー再現 ===
export function makeQKey({
  turn,
  hand,                    // 6枚
  opponentHand,            // 6枚
  opponentSlotLen = 0,     // 0..4（先攻でも 0）
  opponentSlot = [],       // []
  isFirst,                 // boolean
  action,                  // 配列
}) {
  const own_vec      = handToVec(hand);
  const opp_vec      = handToVec(opponentHand);
  const opp_slot_vec = slotToVec(opponentSlot);
  const total_vec    = handToVec([...(hand || []), ...(opponentHand || [])]);
  const collect_idx  = argmaxCountIndex(hand, opponentHand);
  const action_vec   = handToVec(action);

  const stateStr = pyTuple([
    String(turn),
    vecStr(own_vec),
    vecStr(opp_vec),
    String(opponentSlotLen | 0), // 明示的に整数
    vecStr(opp_slot_vec),
    vecStr(total_vec),
    pyBool(!!isFirst),
    String(collect_idx),
  ]);

  const actionStr = vecStr(action_vec);
  return `(${stateStr}, ${actionStr})`; // ← 学習時の str((state, action_vec))
}
