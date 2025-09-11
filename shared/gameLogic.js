export function removeExactCards(from, cardsToRemove) {
  const result = [...from];
  for (const card of cardsToRemove) {
    const idx = result.indexOf(card);
    if (idx !== -1) result.splice(idx, 1);
  }
  return result;
}

// FSFルール
export function isPlayerTurnInFSS(turn, isPlayerFirst) {
  return (turn % 2 === 1) ? isPlayerFirst : !isPlayerFirst;
}

export function calculateScore(hand) {
  const types = ['A', 'B', 'C', 'D'];
  let score = 0;
  for (const t of types) {
    const c = hand.filter(x => x === t).length;
    if (c === 2) score += 2;
    else if (c === 3) score += 5;
    else if (c === 4) score += 10;
    else if (c === 5) score += 20;
    else if (c === 6) score += 30; 
  }
  return score;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
