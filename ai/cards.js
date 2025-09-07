// ai/cards.js
export function sortByValue(arr) {
  return [...arr].sort((a, b) => a.c.localeCompare(b.c));
}

export function dealDeck(shuffle) {
  const base = [
    'A','A','A','A','A','A',
    'B','B','B','B','B','B',
    'C','C','C','C','C','C',
    'D','D','D','D','D','D'
  ];
  // インデックスで一意なidを付与
  const deck = shuffle(base).map((c, i) => ({ id: `card-${i}`, c }));
  return { player: deck.slice(0, 6), ai: deck.slice(6, 12) };
}

// raw配列から、values（['A','C',...]）に一致する要素を「左→右で最初一致」規則で取り出す
export function takeFromRawByValues(raw, values) {
  const remain = [...raw];
  const out = [];
  for (const v of values) {
    const idx = remain.findIndex(o => o.c === v);
    if (idx === -1) throw new Error('value not found in raw');
    out.push(remain[idx]);
    remain.splice(idx, 1);
  }
  return out; // [{id,c}] の配列、順序＝valuesの順
}

// raw配列から、ids(Set)を除去
export function removeByIds(raw, ids) {
  const idSet = ids instanceof Set ? ids : new Set(ids);
  return raw.filter(o => !idSet.has(o.id));
}
