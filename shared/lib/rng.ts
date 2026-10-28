// Seeded RNG (implementation.md Section 4.5, Section 13). The demo must be
// reproducible: same seed, same failed items, every run. A small mulberry32
// gives a deterministic uniform stream; Box-Muller layers a normal draw on top
// for synthetic data generation.

export interface Rng {
  /** Next uniform in [0, 1). */
  next: () => number;
  /** Integer in [loInclusive, hiExclusive). */
  int: (loInclusive: number, hiExclusive: number) => number;
  /** Normal draw with the given mean and standard deviation. */
  normal: (mean?: number, sd?: number) => number;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: number): Rng {
  const next = mulberry32(seed);
  return {
    next,
    int(lo, hi) {
      return lo + Math.floor(next() * (hi - lo));
    },
    normal(mean = 0, sd = 1) {
      // Box-Muller transform. Guard against log(0).
      let u = 0;
      let v = 0;
      while (u === 0) u = next();
      while (v === 0) v = next();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      return mean + sd * z;
    },
  };
}
