// A small seeded generator (mulberry32) so a run started with ?seed=N plays
// the same way every time: the screenshot scenes depend on it.
export function createRandom(seed) {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) {
      return min + this.next() * (max - min);
    },
    int(count) {
      return Math.floor(this.next() * count);
    },
    pick(items) {
      return items[Math.floor(this.next() * items.length)];
    },
    chance(p) {
      return this.next() < p;
    },
  };
}
