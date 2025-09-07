export function handToVec(hand) {
  const vec = [0, 0, 0, 0];
  for (const c of hand) {
    const idx = "ABCD".indexOf(c);
    if (idx !== -1) vec[idx]++;
  }
  return vec;
}

export function slotToVec(slot) {
  return handToVec(slot);
}

export function allPossibleActions(hand, fixedCount = null) {
  const results = [];
  const minR = fixedCount ?? 1;
  const maxR = fixedCount ?? Math.min(4, hand.length);

  for (let r = minR; r <= maxR; r++) {
    if (r > hand.length) break;
    combine(hand, r, 0, [], results);
  }
  return results;
}

function combine(arr, len, start, acc, results) {
  if (acc.length === len) {
    results.push([...acc]);
    return;
  }
  for (let i = start; i < arr.length; i++) {
    acc.push(arr[i]);
    combine(arr, len, i + 1, acc, results);
    acc.pop();
  }
}
