// ai/aiBattleManager.js
import { makeQKey } from './pyKey';
import { allPossibleActions } from './aiUtils';

// === 軽量ヒューリスティック（Qヒットなしのフォールバック） ===
function fallbackRule(hand, opponentHand, isFirst, requiredLen) {
  const order = 'ABCD';
  const total = { A:0, B:0, C:0, D:0 };
  const mine  = { A:0, B:0, C:0, D:0 };

  for (const c of hand) mine[c]++, total[c]++;
  for (const c of opponentHand) total[c]++;

  // ① total降順 ② mine降順 ③ ABCD順
  const target = Object.keys(total).sort((x, y) =>
    (total[y] - total[x]) ||
    (mine[y]  - mine[x])  ||
    (order.indexOf(x) - order.indexOf(y))
  )[0];

  const others = hand.filter(c => c !== target);

  if (isFirst) {
    if (others.length >= 1) return others.slice(0, Math.min(4, others.length));
    return [target];
  } else {
    const need = Math.max(1, Math.min(4, requiredLen || 1));
    const pick = [...others.slice(0, need)];
    if (pick.length < need) {
      pick.push(...hand.filter(c => c === target).slice(0, need - pick.length));
    }
    return pick.slice(0, need);
  }
}

export function selectFromQ(Q, turn, hand, opponentHand, opponentSlot = [], isFirst) {
  // 後攻なのに相手提出が未確定 ⇒ ここで動くべきではない（呼び出し側が待機する）
  if (!isFirst && opponentSlot.length === 0) return null;

  const requiredLength = isFirst ? null : opponentSlot.length;
  const actions = allPossibleActions(hand, requiredLength);

  // 万一、候補生成が空になっても必ずフォールバックで1〜4枚返す
  if (!actions || actions.length === 0) {
    console.warn('💥 no valid actions from allPossibleActions -> fallback');
    return fallbackRule(hand, opponentHand, isFirst, requiredLength);
  }

  const norm = a => [...a].sort();
  let best = [], bestScore = -Infinity, hits = 0;

  for (const action of actions) {
    const key = makeQKey({
      turn,
      hand,
      opponentHand,
      opponentSlotLen: isFirst ? 0 : opponentSlot.length,
      opponentSlot: isFirst ? [] : norm(opponentSlot),
      isFirst,
      action: norm(action),
    });

    const score = Q[key];
    if (score !== undefined) {
      hits++;
      if (score > bestScore) { bestScore = score; best = [action]; }
      else if (score === bestScore) { best.push(action); }
    }
  }

  if (best.length) {
    if (Math.random() < 0.05) console.log(`[Q] hits: ${hits}/${actions.length} (t=${turn}, first=${isFirst})`);
    return best[Math.floor(Math.random() * best.length)];
  }

  console.warn(`[Q] no hit -> fallback (t=${turn}, first=${isFirst}, actions=${actions.length})`);
  return fallbackRule(hand, opponentHand, isFirst, requiredLength);
}
