import { describe, it, expect } from 'vitest';
import { createRNG } from '../../src/sampling/random';

describe('createRNG', () => {
  it('with same seed produces same sequence', () => {
    const rng1 = createRNG(42);
    const rng2 = createRNG(42);

    const seq1 = Array.from({ length: 100 }, () => rng1.next());
    const seq2 = Array.from({ length: 100 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
  });

  it('with different seeds produces different sequences', () => {
    const rng1 = createRNG(42);
    const rng2 = createRNG(999);

    const seq1 = Array.from({ length: 20 }, () => rng1.next());
    const seq2 = Array.from({ length: 20 }, () => rng2.next());

    expect(seq1).not.toEqual(seq2);
  });

  describe('next()', () => {
    it('values are in [0, 1)', () => {
      const rng = createRNG(12345);
      for (let i = 0; i < 10000; i++) {
        const val = rng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('nextInt()', () => {
    it('values are in [min, max]', () => {
      const rng = createRNG(67890);
      const min = 5;
      const max = 15;
      const seen = new Set<number>();

      for (let i = 0; i < 10000; i++) {
        const val = rng.nextInt(min, max);
        expect(val).toBeGreaterThanOrEqual(min);
        expect(val).toBeLessThanOrEqual(max);
        expect(Number.isInteger(val)).toBe(true);
        seen.add(val);
      }

      // With 10000 draws from [5,15], we should see all 11 values
      expect(seen.size).toBe(max - min + 1);
    });

    it('works with min === max', () => {
      const rng = createRNG(111);
      for (let i = 0; i < 100; i++) {
        expect(rng.nextInt(7, 7)).toBe(7);
      }
    });
  });

  describe('nextBool()', () => {
    it('respects probability p=0 (always false)', () => {
      const rng = createRNG(222);
      for (let i = 0; i < 1000; i++) {
        expect(rng.nextBool(0)).toBe(false);
      }
    });

    it('respects probability p=1 (always true)', () => {
      const rng = createRNG(333);
      for (let i = 0; i < 1000; i++) {
        expect(rng.nextBool(1)).toBe(true);
      }
    });

    it('respects probability p=0.5 (approximately half true)', () => {
      const rng = createRNG(444);
      let trueCount = 0;
      const n = 10000;
      for (let i = 0; i < n; i++) {
        if (rng.nextBool(0.5)) trueCount++;
      }
      const ratio = trueCount / n;
      // Should be roughly 0.5, allow generous tolerance
      expect(ratio).toBeGreaterThan(0.45);
      expect(ratio).toBeLessThan(0.55);
    });
  });
});
