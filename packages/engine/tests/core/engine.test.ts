import { describe, it, expect } from 'vitest';
import { DeterministicEngine } from '../../src/core/engine';
import { checkConservation } from '../../src/core/conservation';
import { createRNG } from '../../src/sampling/random';
import { sampleParameterVector } from '../../src/sampling/sampler';
import type { SimulationConfig, ParameterDistributions } from '../../src/core/state';
import type { LLMAdapter } from '../../src/agents/resolver';

/** A mock LLM adapter that always throws, forcing heuristic fallback. */
const heuristicAdapter: LLMAdapter = {
  async resolveAgentDecision() {
    throw new Error('Use heuristic fallback');
  },
  async generateNarrative() {
    return 'test narrative';
  },
  async generateSummary() {
    return 'test summary';
  },
};

function makeConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    programName: 'Test Program',
    assetType: 'fiat_voucher',
    country: 'India',
    region: 'South Asia',
    programType: 'govt_subsidy',
    totalCap: 10000,
    currency: 'INR',
    perBeneficiaryLimit: 500,
    conditionLogic: { gte: ['age', 18] },
    oracleType: 'blockchain',
    redemptionWindowDays: 30,
    slashingConditions: ['fraud_detected'],
    disputeResolution: 'arbitration',
    catastrophicFailureThreshold: {
      metric: 'leakage_rate',
      operator: 'gt',
      value: 0.5,
    },
    stressScenarios: ['oracle_failure', 'collusion_attack'],
    populationSize: 20,
    adversaryIntensity: 'medium',
    timeSteps: 5,
    seed: 42,
    ...overrides,
  };
}

const defaultDistributions: ParameterDistributions = {
  corruptionRate: { alpha: 3, beta: 5 },
  oracleFailureProb: 0.1,
  coalitionSuccessProb: 0.4,
  merchantCoverage: { alpha: 4, beta: 4 },
  adversaryDensity: 2,
  politicalSalience: 0.5,
  liquidityShockProb: 0.05,
  sybilScale: 2.0,
};

function sampleParams(seed: number, config: SimulationConfig) {
  const rng = createRNG(seed);
  return sampleParameterVector(defaultDistributions, rng, config);
}

describe('DeterministicEngine', () => {
  it('full simulation runs to completion', async () => {
    const config = makeConfig();
    const params = sampleParams(42, config);
    const engine = new DeterministicEngine(42);

    const result = await engine.runSimulation(config, params, heuristicAdapter);

    expect(result).toBeDefined();
    expect(result.finalState).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(result.finalState.timeStep).toBe(config.timeSteps);
  });

  it('simulation produces valid metrics', async () => {
    const config = makeConfig();
    const params = sampleParams(42, config);
    const engine = new DeterministicEngine(42);

    const result = await engine.runSimulation(config, params, heuristicAdapter);

    expect(result.metrics.redemptionRate).toBeGreaterThanOrEqual(0);
    expect(result.metrics.redemptionRate).toBeLessThanOrEqual(1);
    expect(result.metrics.leakageRate).toBeGreaterThanOrEqual(0);
    expect(result.metrics.leakageRate).toBeLessThanOrEqual(1);
    expect(result.metrics.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.metrics.riskScore).toBeLessThanOrEqual(10);
    expect(typeof result.metrics.catastrophicFailure).toBe('boolean');
    expect(typeof result.metrics.collusionSucceeded).toBe('boolean');
    expect(result.metrics.totalRedeemed).toBeGreaterThanOrEqual(0);
    expect(result.metrics.totalLeaked).toBeGreaterThanOrEqual(0);
    expect(result.metrics.totalSlashed).toBeGreaterThanOrEqual(0);
  });

  it('conservation holds at every step (check final state)', async () => {
    const config = makeConfig({ timeSteps: 10 });
    const params = sampleParams(42, config);
    const engine = new DeterministicEngine(42);

    const result = await engine.runSimulation(config, params, heuristicAdapter);

    // The engine enforces conservation at every step. If it didn't hold,
    // it would have thrown (and been recorded in validationErrors).
    // Verify conservation on the final ledger.
    expect(checkConservation(result.finalState.ledger)).toBe(true);

    // Also verify the sum explicitly
    const ledger = result.finalState.ledger;
    const sum =
      ledger.totalRedeemed +
      ledger.totalLeaked +
      ledger.totalSlashed +
      ledger.totalUnredeemed;
    expect(Math.abs(ledger.totalIssued - sum)).toBeLessThan(0.001);
  });

  it('same seed produces identical results (determinism)', async () => {
    const config = makeConfig({ seed: 99 });
    const params1 = sampleParams(99, config);
    const params2 = sampleParams(99, config);

    const engine1 = new DeterministicEngine(99);
    const engine2 = new DeterministicEngine(99);

    const result1 = await engine1.runSimulation(config, params1, heuristicAdapter);
    const result2 = await engine2.runSimulation(config, params2, heuristicAdapter);

    // Metrics should be identical
    expect(result1.metrics).toEqual(result2.metrics);

    // Ledger should be identical
    expect(result1.finalState.ledger).toEqual(result2.finalState.ledger);

    // Event log length should be identical
    expect(result1.finalState.eventLog.length).toEqual(
      result2.finalState.eventLog.length
    );

    // Agent count should be identical
    expect(result1.finalState.agents.length).toEqual(
      result2.finalState.agents.length
    );
  });

  it('different seeds produce different results', async () => {
    const config = makeConfig();

    const params1 = sampleParams(42, config);
    const params2 = sampleParams(9999, config);

    const engine1 = new DeterministicEngine(42);
    const engine2 = new DeterministicEngine(9999);

    const result1 = await engine1.runSimulation(config, params1, heuristicAdapter);
    const result2 = await engine2.runSimulation(config, params2, heuristicAdapter);

    // At least one metric should differ
    const metricsMatch =
      result1.metrics.redemptionRate === result2.metrics.redemptionRate &&
      result1.metrics.leakageRate === result2.metrics.leakageRate &&
      result1.metrics.totalRedeemed === result2.metrics.totalRedeemed &&
      result1.metrics.totalLeaked === result2.metrics.totalLeaked &&
      result1.metrics.totalSlashed === result2.metrics.totalSlashed;

    expect(metricsMatch).toBe(false);
  });
});
