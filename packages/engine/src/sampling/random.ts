/**
 * Seedable PRNG interface.
 */
export interface RandomSource {
  /** Returns a uniform random number in [0, 1). */
  next(): number;
  /** Returns a random integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number;
  /** Returns true with probability p. */
  nextBool(p: number): boolean;
}

/**
 * Mulberry32 — a simple, high-quality 32-bit seedable PRNG.
 * Period: 2^32. Good enough for simulation work.
 */
export function createRNG(seed: number): RandomSource {
  let state = seed | 0;

  function mulberry32(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next(): number {
      return mulberry32();
    },

    nextInt(min: number, max: number): number {
      const range = max - min + 1;
      return min + Math.floor(mulberry32() * range);
    },

    nextBool(p: number): boolean {
      return mulberry32() < p;
    },
  };
}
