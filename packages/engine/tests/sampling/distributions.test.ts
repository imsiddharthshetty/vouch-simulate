import { describe, it, expect } from 'vitest';
import { createRNG } from '../../src/sampling/random';
import {
  sampleBeta,
  sampleBernoulli,
  samplePoisson,
  samplePareto,
} from '../../src/sampling/distributions';

describe('sampleBeta', () => {
  it('returns values in [0, 1]', () => {
    const rng = createRNG(42);
    for (let i = 0; i < 5000; i++) {
      const val = sampleBeta(2, 5, rng);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('mean approximates alpha/(alpha+beta) over 10000 samples', () => {
    const alpha = 3;
    const beta = 7;
    const expectedMean = alpha / (alpha + beta); // 0.3
    const rng = createRNG(123);
    let sum = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) {
      sum += sampleBeta(alpha, beta, rng);
    }
    const mean = sum / n;
    expect(mean).toBeCloseTo(expectedMean, 1); // within 0.05
  });

  it('works with alpha < 1 and beta < 1 (Johnk algorithm)', () => {
    const rng = createRNG(999);
    const alpha = 0.5;
    const beta = 0.5;
    const expectedMean = alpha / (alpha + beta); // 0.5
    let sum = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) {
      const val = sampleBeta(alpha, beta, rng);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
      sum += val;
    }
    const mean = sum / n;
    expect(mean).toBeCloseTo(expectedMean, 1);
  });

  it('throws for invalid parameters', () => {
    const rng = createRNG(1);
    expect(() => sampleBeta(0, 1, rng)).toThrow();
    expect(() => sampleBeta(1, -1, rng)).toThrow();
  });
});

describe('sampleBernoulli', () => {
  it('returns boolean', () => {
    const rng = createRNG(42);
    for (let i = 0; i < 100; i++) {
      const val = sampleBernoulli(0.5, rng);
      expect(typeof val).toBe('boolean');
    }
  });

  it('mean approximates p over 10000 samples', () => {
    const p = 0.3;
    const rng = createRNG(555);
    let trueCount = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) {
      if (sampleBernoulli(p, rng)) trueCount++;
    }
    const mean = trueCount / n;
    expect(mean).toBeCloseTo(p, 1);
  });

  it('p=0 always returns false', () => {
    const rng = createRNG(1);
    for (let i = 0; i < 100; i++) {
      expect(sampleBernoulli(0, rng)).toBe(false);
    }
  });

  it('p=1 always returns true', () => {
    const rng = createRNG(1);
    for (let i = 0; i < 100; i++) {
      expect(sampleBernoulli(1, rng)).toBe(true);
    }
  });
});

describe('samplePoisson', () => {
  it('returns non-negative integers', () => {
    const rng = createRNG(42);
    for (let i = 0; i < 5000; i++) {
      const val = samplePoisson(5, rng);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('mean approximates lambda over 10000 samples (small lambda)', () => {
    const lambda = 4;
    const rng = createRNG(777);
    let sum = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) {
      sum += samplePoisson(lambda, rng);
    }
    const mean = sum / n;
    expect(mean).toBeCloseTo(lambda, 0); // within 0.5
  });

  it('mean approximates lambda over 10000 samples (large lambda, normal approx)', () => {
    const lambda = 50;
    const rng = createRNG(888);
    let sum = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) {
      sum += samplePoisson(lambda, rng);
    }
    const mean = sum / n;
    expect(mean).toBeCloseTo(lambda, 0); // within 0.5
  });

  it('returns 0 for lambda <= 0', () => {
    const rng = createRNG(1);
    expect(samplePoisson(0, rng)).toBe(0);
    expect(samplePoisson(-5, rng)).toBe(0);
  });
});

describe('samplePareto', () => {
  it('returns values >= 1', () => {
    const rng = createRNG(42);
    for (let i = 0; i < 5000; i++) {
      const val = samplePareto(2, rng);
      expect(val).toBeGreaterThanOrEqual(1);
    }
  });

  it('with large alpha, values concentrate near 1', () => {
    // Higher alpha = less heavy tail, values closer to 1
    const rng = createRNG(100);
    const alpha = 10;
    let sum = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) {
      sum += samplePareto(alpha, rng);
    }
    const mean = sum / n;
    // For Pareto with x_min=1, mean = alpha/(alpha-1) = 10/9 ~ 1.111
    const expectedMean = alpha / (alpha - 1);
    expect(mean).toBeCloseTo(expectedMean, 1);
  });

  it('throws for alpha <= 0', () => {
    const rng = createRNG(1);
    expect(() => samplePareto(0, rng)).toThrow();
    expect(() => samplePareto(-1, rng)).toThrow();
  });
});
