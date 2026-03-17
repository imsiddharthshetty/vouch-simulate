import {
  ParameterDistributions,
  ParameterVector,
  SimulationConfig,
  StressScenario,
} from '../core/state';
import { RandomSource } from './random';
import {
  sampleBeta,
  sampleBernoulli,
  samplePoisson,
  samplePareto,
} from './distributions';

/**
 * Sample a full ParameterVector from the distribution definitions.
 * Also samples event timings (which time step each stress event triggers at).
 */
export function sampleParameterVector(
  distributions: ParameterDistributions,
  rng: RandomSource,
  config: SimulationConfig
): ParameterVector {
  const corruptionRate = sampleBeta(
    distributions.corruptionRate.alpha,
    distributions.corruptionRate.beta,
    rng
  );

  const oracleFailureProb = distributions.oracleFailureProb;

  const coalitionSuccessProb = distributions.coalitionSuccessProb;

  const merchantCoverage = sampleBeta(
    distributions.merchantCoverage.alpha,
    distributions.merchantCoverage.beta,
    rng
  );

  const adversaryDensity = samplePoisson(
    distributions.adversaryDensity,
    rng
  );

  const politicalSalience = sampleBernoulli(
    distributions.politicalSalience,
    rng
  );

  const liquidityShockProb = distributions.liquidityShockProb;

  const sybilScale = samplePareto(distributions.sybilScale, rng);

  // Sample event timings: each stress scenario gets a random trigger time step
  const eventTimings: Record<string, number> = {};
  for (const scenario of config.stressScenarios) {
    // Events trigger in the first 80% of the simulation to allow consequences to play out
    const maxStep = Math.floor(config.timeSteps * 0.8);
    const minStep = Math.max(1, Math.floor(config.timeSteps * 0.1));
    eventTimings[scenario] = rng.nextInt(minStep, maxStep);
  }

  return {
    corruptionRate,
    oracleFailureProb,
    coalitionSuccessProb,
    merchantCoverage,
    adversaryDensity,
    politicalSalience,
    liquidityShockProb,
    sybilScale,
    eventTimings,
  };
}
