// Test de propriété sans dépendance : un générateur graine (mulberry32) et
// `forAll`, qui rejoue n tirages et nomme la GRAINE du tirage fautif — un
// contre-exemple se rejoue, il ne se commente pas.

export type Rng = {
  next(): number;                       // [0,1)
  int(lo: number, hi: number): number;  // [lo, hi]
  pick<T>(xs: readonly T[]): T;
  bool(p?: number): boolean;
  shuffle<T>(xs: readonly T[]): T[];
};

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  return {
    next, int,
    pick: (xs) => xs[int(0, xs.length - 1)],
    bool: (p = 0.5) => next() < p,
    shuffle: (xs) => { const o = [...xs]; for (let i = o.length - 1; i > 0; i--) { const j = int(0, i); [o[i], o[j]] = [o[j], o[i]]; } return o; },
  };
}

/** n tirages, graines 1..n (ou `from`..). La première violation lève avec sa graine. */
export async function forAll(n: number, prop: (r: Rng, seed: number) => void | Promise<void>, from = 1): Promise<void> {
  for (let seed = from; seed < from + n; seed++) {
    try { await prop(rng(seed), seed); }
    catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw Object.assign(new Error(`contre-exemple, graine ${seed} : ${msg}`), { cause: e });
    }
  }
}
