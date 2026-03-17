import {
  SimulationState,
  SimulationConfig,
  ParameterVector,
  AgentState,
  AgentAction,
  RunResult,
  RunMetrics,
  LedgerState,
  SystemState,
  AgentType,
} from './state';
import { enforceConservation, validateLedgerValues } from './conservation';
import { validateActions } from './constraints';
import { applyActions, triggerEvents } from './transitions';
import { RandomSource } from '../sampling/random';
import { createRNG } from '../sampling/random';
import { LLMAdapter, AgentDecisionContext } from '../agents/resolver';
import { resolveAgentDecision } from '../agents/resolver';
import { AGENT_REGISTRY, getAgentsForContext } from '../agents/registry';

/**
 * Deterministic simulation engine.
 * Given the same config, parameters, and seed, produces identical results.
 */
export class DeterministicEngine {
  private rng: RandomSource;

  constructor(seed: number) {
    this.rng = createRNG(seed);
  }

  /**
   * Create the initial SimulationState from config and sampled parameters.
   */
  initState(config: SimulationConfig, params: ParameterVector): SimulationState {
    const ledger: LedgerState = {
      totalIssued: config.totalCap,
      totalRedeemed: 0,
      totalLeaked: 0,
      totalSlashed: 0,
      totalUnredeemed: config.totalCap,
    };

    const system: SystemState = {
      oracleAvailable: true,
      merchantCoverage: params.merchantCoverage,
      paymentRailHealth: 1.0,
      regulatoryAttention: 0.1,
      mediaCoverage: 0,
      politicalSalience: params.politicalSalience ? 0.3 : 0.1,
    };

    const agents = this.generateAgentRoster(config, params);

    return {
      timeStep: 0,
      ledger,
      agents,
      system,
      eventLog: [],
    };
  }

  /**
   * Generate the agent roster based on config.
   */
  private generateAgentRoster(
    config: SimulationConfig,
    params: ParameterVector
  ): AgentState[] {
    const agentDefs = getAgentsForContext(
      config.programType,
      config.adversaryIntensity
    );

    const agents: AgentState[] = [];
    let idCounter = 0;

    // Determine population distribution
    const totalPop = config.populationSize;

    // Faction allocation ratios
    const factionRatios: Record<string, number> = {
      beneficiaries: 0.5,
      field_ops: 0.1,
      merchants: 0.15,
      political_media: 0.05,
      oracles: 0.05,
      financial_rails: 0.05,
      competitors: 0.05,
      ai_adversarial: 0.05,
    };

    // Adjust based on adversary intensity
    if (config.adversaryIntensity === 'high') {
      factionRatios.ai_adversarial = 0.1;
      factionRatios.beneficiaries = 0.4;
    } else if (config.adversaryIntensity === 'low') {
      factionRatios.ai_adversarial = 0.02;
      factionRatios.competitors = 0.03;
      factionRatios.beneficiaries = 0.55;
    }

    // Group agent defs by faction for allocation
    const defsByFaction = new Map<string, typeof agentDefs>();
    for (const def of agentDefs) {
      const list = defsByFaction.get(def.faction) || [];
      list.push(def);
      defsByFaction.set(def.faction, list);
    }

    for (const [faction, defs] of defsByFaction.entries()) {
      const factionPop = Math.max(
        1,
        Math.round(totalPop * (factionRatios[faction] ?? 0.05))
      );

      // Split population among agent types in this faction
      // For corrupt vs honest split, use corruption rate
      for (let i = 0; i < factionPop; i++) {
        // Pick which agent type this individual is
        let def = defs[i % defs.length];

        // Special handling: corrupt vs honest field agent split
        if (faction === 'field_ops' && defs.length > 1) {
          const isCorrupt = this.rng.next() < params.corruptionRate;
          def = defs.find(
            (d) =>
              d.type ===
              (isCorrupt ? 'corrupt_field_agent' : 'honest_field_agent')
          ) ?? def;
        }

        // Special handling: registered vs shell merchant split
        if (faction === 'merchants' && defs.length > 1) {
          const isShell = this.rng.next() < params.corruptionRate * 0.5;
          def = defs.find(
            (d) =>
              d.type ===
              (isShell ? 'shell_merchant' : 'registered_merchant')
          ) ?? def;
        }

        // Special handling: trusted vs compromised oracle split
        if (faction === 'oracles' && defs.length > 1) {
          const isCompromised = this.rng.next() < params.corruptionRate * 0.3;
          def = defs.find(
            (d) =>
              d.type ===
              (isCompromised ? 'compromised_oracle' : 'trusted_oracle')
          ) ?? def;
        }

        agents.push({
          id: `${def.type}_${idCounter++}`,
          type: def.type as AgentType,
          faction: def.faction,
          utilityAccumulated: 0,
          actionsThisRun: [],
          coalitions: [],
          detected: false,
          active: true,
        });
      }
    }

    return agents;
  }

  /**
   * Run one time step: validate actions -> apply -> trigger events -> enforce conservation.
   */
  stepForward(
    state: SimulationState,
    actions: AgentAction[],
    config: SimulationConfig,
    params: ParameterVector
  ): SimulationState {
    state.timeStep++;

    // Validate actions
    const { valid, rejected } = validateActions(actions, state, config);

    // Log rejected actions
    for (const { action, reason } of rejected) {
      state.eventLog.push({
        timeStep: state.timeStep,
        type: 'agent_action_rejected',
        agentId: action.agentId,
        description: `Action '${action.type}' rejected: ${reason}`,
        impact: {},
      });
    }

    // Apply valid actions
    applyActions(state, valid);

    // Trigger system events
    triggerEvents(state, params, config, this.rng);

    // Enforce conservation law
    validateLedgerValues(state.ledger);
    enforceConservation(state.ledger);

    // Check for catastrophic failure
    const metrics = this.computeMetrics(state, config);
    if (metrics.catastrophicFailure) {
      state.eventLog.push({
        timeStep: state.timeStep,
        type: 'catastrophic_failure',
        description: `Catastrophic failure: ${config.catastrophicFailureThreshold.metric} ${config.catastrophicFailureThreshold.operator} ${config.catastrophicFailureThreshold.value}`,
        impact: { catastrophic: 1 },
      });
    }

    return state;
  }

  /**
   * Run full simulation (all time steps), returning RunResult.
   */
  async runSimulation(
    config: SimulationConfig,
    params: ParameterVector,
    adapter: LLMAdapter
  ): Promise<RunResult> {
    let state = this.initState(config, params);
    const validationErrors: string[] = [];

    for (let t = 0; t < config.timeSteps; t++) {
      // Collect proposed actions from all active agents
      const actions: AgentAction[] = [];

      for (const agent of state.agents) {
        if (!agent.active) continue;

        const definition = AGENT_REGISTRY.get(agent.type);
        if (!definition) continue;

        const context: AgentDecisionContext = {
          agent,
          definition,
          state,
          config,
          parameters: params,
        };

        const action = await resolveAgentDecision(context, adapter);
        actions.push(action);
      }

      // Step forward
      try {
        state = this.stepForward(state, actions, config, params);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        validationErrors.push(`Step ${t + 1}: ${message}`);
        // On conservation violation, try to recover by adjusting unredeemed
        if (message.includes('Conservation violated')) {
          const sum =
            state.ledger.totalRedeemed +
            state.ledger.totalLeaked +
            state.ledger.totalSlashed;
          state.ledger.totalUnredeemed = state.ledger.totalIssued - sum;
        }
      }

      // Deactivate detected agents with some probability
      for (const agent of state.agents) {
        if (agent.detected && agent.active) {
          if (this.rng.nextBool(state.system.regulatoryAttention * 0.5)) {
            agent.active = false;
            // Slash their accumulated utility
            const slashAmount = Math.min(
              agent.utilityAccumulated * 0.5,
              state.ledger.totalUnredeemed
            );
            if (slashAmount > 0) {
              state.ledger.totalSlashed += slashAmount;
              state.ledger.totalUnredeemed -= slashAmount;
            }
          }
        }
      }
    }

    const metrics = this.computeMetrics(state, config);

    return {
      runNumber: 1,
      seed: 0, // caller sets this
      parameters: params,
      finalState: state,
      metrics,
      valid: validationErrors.length === 0,
      validationErrors,
    };
  }

  /**
   * Compute RunMetrics from the current state and config.
   */
  computeMetrics(state: SimulationState, config: SimulationConfig): RunMetrics {
    const issued = state.ledger.totalIssued || 1; // avoid div by zero

    const redemptionRate = state.ledger.totalRedeemed / issued;
    const leakageRate = state.ledger.totalLeaked / issued;
    const totalSlashed = state.ledger.totalSlashed;

    // Check collusion: did any coalition persist undetected?
    const collusionSucceeded = state.agents.some(
      (a) => a.coalitions.length > 0 && !a.detected && a.active
    );

    // Risk score: 0-10 composite
    const riskScore = Math.min(
      10,
      leakageRate * 20 +
        (collusionSucceeded ? 2 : 0) +
        (1 - state.system.paymentRailHealth) * 2 +
        state.system.politicalSalience * 1.5 +
        (1 - state.system.merchantCoverage) * 1.5
    );

    // Check catastrophic failure threshold
    let catastrophicFailure = false;
    const threshold = config.catastrophicFailureThreshold;
    let metricValue = 0;
    switch (threshold.metric) {
      case 'leakage_rate':
        metricValue = leakageRate;
        break;
      case 'redemption_rate':
        metricValue = redemptionRate;
        break;
      case 'risk_score':
        metricValue = riskScore;
        break;
    }
    if (threshold.operator === 'gt') {
      catastrophicFailure = metricValue > threshold.value;
    } else {
      catastrophicFailure = metricValue < threshold.value;
    }

    return {
      redemptionRate,
      leakageRate,
      catastrophicFailure,
      collusionSucceeded,
      riskScore,
      totalRedeemed: state.ledger.totalRedeemed,
      totalLeaked: state.ledger.totalLeaked,
      totalSlashed,
    };
  }
}
