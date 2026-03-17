// ============================================================
// @vouch/simulate-engine — Public API
// ============================================================

// --- Core types ---
export type {
  LedgerState,
  AgentState,
  SystemState,
  SimulationState,
  EventEntry,
  EventType,
  AgentAction,
  ActionType,
  Faction,
  AgentType,
  AssetType,
  ProgramType,
  StressScenario,
  ConditionRule,
  SimulationConfig,
  ParameterDistributions,
  ParameterVector,
  RunResult,
  RunMetrics,
  QuickScanResult,
  FailureMode,
  Recommendation,
} from './core/state';

// --- Conservation ---
export {
  checkConservation,
  enforceConservation,
  validateLedgerValues,
  ConservationViolationError,
} from './core/conservation';

// --- Constraints ---
export { validateAction, validateActions } from './core/constraints';
export type { ValidationResult, ValidationSuccess, ValidationFailure } from './core/constraints';

// --- Rules ---
export { evaluateRule } from './core/rules';

// --- Transitions ---
export { applyActions, triggerEvents } from './core/transitions';

// --- Engine ---
export { DeterministicEngine } from './core/engine';

// --- Sampling ---
export { createRNG } from './sampling/random';
export type { RandomSource } from './sampling/random';
export { sampleBeta, sampleBernoulli, samplePoisson, samplePareto } from './sampling/distributions';
export { sampleParameterVector } from './sampling/sampler';

// --- Agents ---
export type { AgentDefinition } from './agents/types';
export { AGENT_REGISTRY, getAgentsByFaction, getAgentsForContext } from './agents/registry';
export type { LLMAdapter, AgentDecisionContext } from './agents/resolver';
export { resolveAgentDecision, heuristicFallback } from './agents/resolver';
export { getHeuristicAction } from './agents/heuristics';

// --- Context ---
export { ASSET_CATALOG, getAssetDefinition } from './context/assets';
export type { AssetDefinition } from './context/assets';
export { COUNTRY_CATALOG, getCountryContext, resolveCountryContext } from './context/countries';
export type { CountryContext } from './context/countries';
export { PROGRAM_CATALOG, getProgramDefinition } from './context/programs';
export type { ProgramDefinition } from './context/programs';

// --- Adapter types (re-export) ---
export type { LLMAdapter as LLMAdapterType } from './adapters/types';

// ============================================================
// runQuickScan — Main entry point
// ============================================================

import type {
  SimulationConfig,
  QuickScanResult,
  FailureMode,
  Recommendation,
  ParameterDistributions,
} from './core/state';
import { DeterministicEngine } from './core/engine';
import { createRNG } from './sampling/random';
import { sampleParameterVector } from './sampling/sampler';
import { resolveCountryContext } from './context/countries';
import { getProgramDefinition } from './context/programs';
import type { LLMAdapter } from './agents/resolver';

/**
 * Validate a SimulationConfig, returning an array of error messages (empty = valid).
 */
export function validateConfig(config: SimulationConfig): string[] {
  const errors: string[] = [];

  if (!config.programName || config.programName.trim().length === 0) {
    errors.push('programName is required');
  }
  if (config.totalCap <= 0) {
    errors.push('totalCap must be positive');
  }
  if (config.perBeneficiaryLimit <= 0) {
    errors.push('perBeneficiaryLimit must be positive');
  }
  if (config.perBeneficiaryLimit > config.totalCap) {
    errors.push('perBeneficiaryLimit cannot exceed totalCap');
  }
  if (config.populationSize < 2) {
    errors.push('populationSize must be at least 2');
  }
  if (config.timeSteps < 1) {
    errors.push('timeSteps must be at least 1');
  }
  if (config.redemptionWindowDays < 1) {
    errors.push('redemptionWindowDays must be at least 1');
  }
  if (!config.country || config.country.trim().length === 0) {
    errors.push('country is required');
  }
  if (!config.currency || config.currency.trim().length === 0) {
    errors.push('currency is required');
  }

  const validAssetTypes = [
    'fiat_voucher',
    'cloud_compute',
    'equity_tokens',
    'carbon_credits',
    'data_access',
    'physical_goods',
    'custom',
  ];
  if (!validAssetTypes.includes(config.assetType)) {
    errors.push(`Invalid assetType: ${config.assetType}`);
  }

  const validProgramTypes = [
    'govt_subsidy',
    'corporate_voucher',
    'ngo_aid',
    'b2b_trade_finance',
    'agentic_commerce',
  ];
  if (!validProgramTypes.includes(config.programType)) {
    errors.push(`Invalid programType: ${config.programType}`);
  }

  const validIntensities = ['low', 'medium', 'high'];
  if (!validIntensities.includes(config.adversaryIntensity)) {
    errors.push(`Invalid adversaryIntensity: ${config.adversaryIntensity}`);
  }

  if (!config.catastrophicFailureThreshold) {
    errors.push('catastrophicFailureThreshold is required');
  }

  return errors;
}

/**
 * Run a quick scan: sample params, run simulation, extract failure modes and recommendations.
 */
export async function runQuickScan(
  config: SimulationConfig,
  adapter: LLMAdapter
): Promise<QuickScanResult> {
  // 1. Validate config
  const errors = validateConfig(config);
  if (errors.length > 0) {
    throw new Error(`Invalid config: ${errors.join('; ')}`);
  }

  // 2. Create RNG
  const seed = config.seed ?? Math.floor(Math.random() * 2147483647);
  const rng = createRNG(seed);

  // 3. Get default distributions
  const countryCtx = resolveCountryContext(config.country, config.region);
  const programDef = getProgramDefinition(config.programType);
  const baseDistributions = programDef?.defaultDistributions ?? {
    corruptionRate: { alpha: 3, beta: 5 },
    oracleFailureProb: 0.1,
    coalitionSuccessProb: 0.4,
    merchantCoverage: { alpha: 4, beta: 4 },
    adversaryDensity: 2,
    politicalSalience: 0.5,
    liquidityShockProb: 0.05,
    sybilScale: 2.0,
  };

  // Merge country overrides
  const distributions: ParameterDistributions = {
    ...baseDistributions,
    ...countryCtx.parameterOverrides,
  } as ParameterDistributions;

  // 4. Sample parameter vector
  const params = sampleParameterVector(distributions, rng, config);

  // 5. Create engine and run simulation
  const engine = new DeterministicEngine(seed);
  const result = await engine.runSimulation(config, params, adapter);
  result.runNumber = 1;
  result.seed = seed;

  // 6. Extract failure modes from event log
  const failureModes = extractFailureModes(result);

  // 7. Generate recommendations based on failure modes
  const recommendations = generateRecommendations(failureModes, config);

  return {
    config,
    run: result,
    narrative: undefined,
    executiveSummary: undefined,
    failureModes,
    recommendations,
  };
}

/**
 * Extract failure modes from the simulation run result.
 */
function extractFailureModes(result: import('./core/state').RunResult): FailureMode[] {
  const modes: FailureMode[] = [];
  const events = result.finalState.eventLog;

  // Check for catastrophic failure
  const catastrophicEvents = events.filter((e) => e.type === 'catastrophic_failure');
  if (catastrophicEvents.length > 0) {
    const first = catastrophicEvents[0];
    modes.push({
      name: 'Catastrophic Failure',
      description: first.description,
      severity: 'critical',
      causalPathway:
        'Accumulated leakage, collusion, or system degradation exceeded threshold',
      timeStep: first.timeStep,
      involvedAgents: [],
    });
  }

  // Check for oracle failure impact
  const oracleFailures = events.filter((e) => e.type === 'oracle_failure');
  if (oracleFailures.length > 0) {
    modes.push({
      name: 'Oracle Failure',
      description:
        'Oracle system failed, blocking legitimate claims and enabling unverified transactions',
      severity: 'high',
      causalPathway:
        'Oracle infrastructure failure leads to verification gap, which is exploited by adversaries',
      timeStep: oracleFailures[0].timeStep,
      involvedAgents: [],
    });
  }

  // Check for collusion
  const coalitionDetected = events.filter((e) => e.type === 'coalition_detected');
  const coalitionFormed = events.filter((e) => e.type === 'coalition_formed');
  if (coalitionFormed.length > 0) {
    const detected = coalitionDetected.length;
    const formed = coalitionFormed.length;
    const undetected = formed - detected;
    const severity =
      undetected > formed * 0.5 ? 'high' : undetected > 0 ? 'medium' : 'low';
    const involvedAgents = [
      ...new Set(coalitionFormed.map((e) => e.agentId).filter(Boolean) as string[]),
    ];
    modes.push({
      name: 'Collusion Network',
      description: `${formed} coalitions formed, ${detected} detected, ${undetected} remain active`,
      severity,
      causalPathway:
        'Adversarial agents form coalitions to coordinate fraud, overwhelming detection systems',
      timeStep: coalitionFormed[0].timeStep,
      involvedAgents,
    });
  }

  // Check for liquidity shock
  const liquidityShocks = events.filter((e) => e.type === 'liquidity_shock');
  if (liquidityShocks.length > 0) {
    const totalSlashed = liquidityShocks.reduce(
      (sum, e) => sum + (e.impact.slashed ?? 0),
      0
    );
    modes.push({
      name: 'Liquidity Crisis',
      description: `${liquidityShocks.length} liquidity shocks, total ${totalSlashed.toFixed(2)} slashed`,
      severity: totalSlashed > result.finalState.ledger.totalIssued * 0.1 ? 'high' : 'medium',
      causalPathway:
        'External liquidity events cause forced slashing of unredeemed funds',
      timeStep: liquidityShocks[0].timeStep,
      involvedAgents: [],
    });
  }

  // Check for high leakage
  if (result.metrics.leakageRate > 0.15) {
    const fraudEvents = events.filter(
      (e) =>
        e.type === 'agent_action' &&
        (e.description.includes('Fraudulent') ||
          e.description.includes('Sybil') ||
          e.description.includes('Replay'))
    );
    const involvedAgents = [
      ...new Set(fraudEvents.map((e) => e.agentId).filter(Boolean) as string[]),
    ];
    modes.push({
      name: 'Excessive Leakage',
      description: `Leakage rate of ${(result.metrics.leakageRate * 100).toFixed(1)}% exceeds acceptable threshold`,
      severity: result.metrics.leakageRate > 0.3 ? 'critical' : 'high',
      causalPathway:
        'Fraudulent claims, sybil attacks, and price inflation drain program funds',
      timeStep: fraudEvents.length > 0 ? fraudEvents[0].timeStep : 0,
      involvedAgents,
    });
  }

  // Check for political weaponization
  const politicalEvents = events.filter(
    (e) => e.type === 'political_intervention'
  );
  if (politicalEvents.length > 2) {
    modes.push({
      name: 'Political Weaponization',
      description:
        'Program has become a political football with frequent interventions',
      severity:
        result.finalState.system.politicalSalience > 0.7 ? 'high' : 'medium',
      causalPathway:
        'Political actors exploit program visibility for electoral gain, distorting operations',
      timeStep: politicalEvents[0].timeStep,
      involvedAgents: politicalEvents
        .map((e) => e.agentId)
        .filter(Boolean) as string[],
    });
  }

  return modes;
}

/**
 * Generate recommendations based on identified failure modes.
 */
function generateRecommendations(
  failureModes: FailureMode[],
  _config: SimulationConfig
): Recommendation[] {
  const recs: Recommendation[] = [];

  for (const mode of failureModes) {
    switch (mode.name) {
      case 'Catastrophic Failure':
        recs.push({
          title: 'Implement Circuit Breaker',
          description:
            'Add automatic program pause when key metrics cross critical thresholds, with manual review before resumption.',
          targetFailureMode: mode.name,
          suggestedChange:
            'Add circuit_breaker_enabled=true with auto-pause at 80% of catastrophic threshold',
          expectedImpact:
            'Prevents total program collapse by halting operations before irreversible damage',
        });
        break;

      case 'Oracle Failure':
        recs.push({
          title: 'Multi-Oracle Redundancy',
          description:
            'Deploy multiple independent oracle sources with consensus-based verification to prevent single points of failure.',
          targetFailureMode: mode.name,
          suggestedChange:
            'Configure at least 2 oracle providers with 2-of-3 consensus requirement',
          expectedImpact:
            'Reduces oracle failure probability from p to p^2 (for 2 independent oracles)',
        });
        recs.push({
          title: 'Offline Verification Queue',
          description:
            'When oracle is down, queue claims for deferred verification rather than blocking all transactions.',
          targetFailureMode: mode.name,
          suggestedChange:
            'Enable deferred_verification_queue with 48-hour verification SLA',
          expectedImpact:
            'Maintains 60-80% throughput during oracle outages while preserving verification integrity',
        });
        break;

      case 'Collusion Network':
        recs.push({
          title: 'Graph-Based Anomaly Detection',
          description:
            'Deploy transaction graph analysis to detect coalition patterns (unusual clustering, circular flows).',
          targetFailureMode: mode.name,
          suggestedChange:
            'Enable graph_anomaly_detection with coalition_threshold=3 agents',
          expectedImpact:
            'Increases collusion detection rate by 40-60% based on network pattern analysis',
        });
        break;

      case 'Liquidity Crisis':
        recs.push({
          title: 'Reserve Buffer',
          description:
            'Maintain a reserve buffer (10-15% of total cap) to absorb liquidity shocks without slashing beneficiary funds.',
          targetFailureMode: mode.name,
          suggestedChange:
            'Set reserve_buffer_ratio=0.12 and fund from program overhead',
          expectedImpact:
            'Absorbs moderate liquidity shocks without impacting beneficiary access to funds',
        });
        break;

      case 'Excessive Leakage':
        recs.push({
          title: 'Velocity-Based Rate Limiting',
          description:
            'Implement per-agent and per-merchant claim velocity limits to slow down extraction attacks.',
          targetFailureMode: mode.name,
          suggestedChange:
            'Set max_claims_per_agent_per_day=3 and max_value_per_merchant_per_day=5x_average',
          expectedImpact:
            'Reduces sybil and fraudulent claim throughput by 50-70% without impacting legitimate users',
        });
        recs.push({
          title: 'Strengthen Identity Verification',
          description:
            'Add biometric or multi-factor identity verification to prevent synthetic identity creation.',
          targetFailureMode: mode.name,
          suggestedChange:
            'Enable biometric_verification for claims above 2x average value',
          expectedImpact:
            'Eliminates 80-90% of sybil attack surface',
        });
        break;

      case 'Political Weaponization':
        recs.push({
          title: 'Transparency Dashboard',
          description:
            'Publish real-time program metrics to reduce information asymmetry that enables political manipulation.',
          targetFailureMode: mode.name,
          suggestedChange:
            'Deploy public_dashboard with real-time redemption, leakage, and coverage metrics',
          expectedImpact:
            'Reduces political attack surface by making factual program data publicly accessible',
        });
        break;
    }
  }

  // Always add a general recommendation if none were generated
  if (recs.length === 0) {
    recs.push({
      title: 'Continuous Monitoring',
      description:
        'Implement continuous monitoring of key metrics (leakage rate, redemption rate, agent behavior) with alerting.',
      targetFailureMode: 'General',
      suggestedChange: 'Enable monitoring_dashboard with alert_thresholds for all key metrics',
      expectedImpact: 'Early detection of emerging failure modes before they reach critical severity',
    });
  }

  return recs;
}
