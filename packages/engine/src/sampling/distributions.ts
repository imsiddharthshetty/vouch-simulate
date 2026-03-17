import { RandomSource } from './random';

/**
 * Sample from a Beta(alpha, beta) distribution.
 * Uses Jöhnk's algorithm for alpha,beta < 1, otherwise gamma-based method.
 */
export function sampleBeta(
  alpha: number,
  beta: number,
  rng: RandomSource
): number {
  if (alpha <= 0 || beta <= 0) {
    throw new Error(`Beta distribution requires alpha > 0, beta > 0. Got alpha=${alpha}, beta=${beta}`);
  }

  if (alpha < 1 && beta < 1) {
    // Jöhnk's algorithm
    while (true) {
      const u = rng.next();
      const v = rng.next();
      const x = Math.pow(u, 1 / alpha);
      const y = Math.pow(v, 1 / beta);
      if (x + y <= 1) {
        if (x + y > 0) {
          return x / (x + y);
        }
        // Extremely rare: both zero due to floating point. Retry.
      }
    }
  }

  // For alpha >= 1 or beta >= 1, use gamma-based: X ~ Gamma(alpha), Y ~ Gamma(beta), return X/(X+Y)
  const x = sampleGamma(alpha, rng);
  const y = sampleGamma(beta, rng);
  if (x + y === 0) return 0.5; // degenerate case
  return x / (x + y);
}

/**
 * Sample from a Gamma(shape, 1) distribution using Marsaglia and Tsang's method.
 */
function sampleGamma(shape: number, rng: RandomSource): number {
  if (shape < 1) {
    // Boost: Gamma(shape) = Gamma(shape+1) * U^(1/shape)
    const g = sampleGamma(shape + 1, rng);
    const u = rng.next();
    return g * Math.pow(u, 1 / shape);
  }

  // Marsaglia and Tsang's method for shape >= 1
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number;
    let v: number;

    do {
      x = sampleNormal(rng);
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = rng.next();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v;
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

/**
 * Sample from standard normal using Box-Muller transform.
 */
function sampleNormal(rng: RandomSource): number {
  const u1 = rng.next();
  const u2 = rng.next();
  return Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Sample from a Bernoulli(p) distribution.
 * Returns 1 with probability p, 0 otherwise.
 */
export function sampleBernoulli(p: number, rng: RandomSource): boolean {
  return rng.next() < p;
}

/**
 * Sample from a Poisson(lambda) distribution using Knuth's algorithm.
 * For lambda > 30, uses normal approximation.
 */
export function samplePoisson(lambda: number, rng: RandomSource): number {
  if (lambda <= 0) return 0;

  if (lambda > 30) {
    // Normal approximation for large lambda
    const n = sampleNormal(rng);
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * n));
  }

  // Knuth's algorithm
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;

  do {
    k++;
    p *= rng.next();
  } while (p > L);

  return k - 1;
}

/**
 * Sample from a Pareto(alpha) distribution using inverse CDF.
 * x_min = 1 (standard Pareto).
 * Returns value >= 1.
 */
export function samplePareto(alpha: number, rng: RandomSource): number {
  if (alpha <= 0) {
    throw new Error(`Pareto distribution requires alpha > 0. Got ${alpha}`);
  }
  const u = rng.next();
  // Avoid division by zero
  return Math.pow(1 - u || 1e-10, -1 / alpha);
}
