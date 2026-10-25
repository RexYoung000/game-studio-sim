// 种子随机（mulberry32）：状态存于 state.rngState，读档后序列连续（tech-spec §1）
export function nextRandom(state) {
  let a = state.rngState | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  state.rngState = a;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(state, min, max) {
  return Math.floor(nextRandom(state) * (max - min + 1)) + min;
}

export function pickRandom(state, arr) {
  return arr[Math.floor(nextRandom(state) * arr.length)];
}

export function chance(state, p) {
  return nextRandom(state) < p;
}

export function weightedPick(state, items, weightOf = (i) => i.weight) {
  const total = items.reduce((s, i) => s + weightOf(i), 0);
  let roll = nextRandom(state) * total;
  for (const item of items) {
    roll -= weightOf(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}
