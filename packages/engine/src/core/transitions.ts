import {
  SimulationState,
  AgentAction,
  ParameterVector,
  SimulationConfig,
  EventEntry,
} from './state';
import { RandomSource } from '../sampling/random';

/**
 * Apply validated actions to state, updating ledger and agent states.
 * Returns the new state (mutates in place for performance).
 */
export function applyActions(
  state: SimulationState,
  validActions: AgentAction[]
): SimulationState {
  for (const action of validActions) {
    const agent = state.agents.find((a) => a.id === action.agentId);
    if (!agent) continue;

    agent.actionsThisRun.push(action);

    switch (action.type) {
      case 'legitimate_claim': {
        const val = action.value ?? 0;
        const claimable = Math.min(val, state.ledger.totalUnredeemed);
        state.ledger.totalRedeemed += claimable;
        state.ledger.totalUnredeemed -= claimable;
        agent.utilityAccumulated += claimable;
        state.eventLog.push({
          timeStep: state.timeStep,
          type: 'agent_action',
          agentId: action.agentId,
          description: `Legitimate claim of ${claimable}`,
          impact: { redeemed: claimable },
        });
        break;
      }

      case 'fraudulent_claim': {
        const val = action.value ?? 0;
        const leakable = Math.min(val, state.ledger.totalUnredeemed);
        state.ledger.totalLeaked += leakable;
        state.ledger.totalUnredeemed -= leakable;
        agent.utilityAccumulated += leakable;
        state.eventLog.push({
          timeStep: state.timeStep,
          type: 'agent_action',
          agentId: action.agentId,
          description: `Fraudulent claim of ${leakable}`,
          impact: { leaked: leakable },
        });
        break;
      }

      case 'false_attestation': {
        // Enables future fraudulent claims by reducing detection probability
        state.system.regulatoryAttention = Math.max(
          0,
          state.system.regulatoryAttention - 0.05
        );
        state.eventLog.push({
          timeStep: state.timeStep,
          type: 'agent_action',
          agentId: action.agentId,
          description: 'False attestation filed',
          impact: { regulatoryAttention: -0.05 },
        });
        break;
      }

      case 'sybil_attack': {
        const val = action.value ?? 0;
        // Sybil attack creates multiple fraudulent claims
        const totalLeak = Math.min(val, state.ledger.totalUnredeemed);
        state.ledger.totalLeaked += totalLeak;
        state.ledger.totalUnredeemed -= totalLeak;
        agent.utilityAccumulated += totalLeak;
        state.eventLog.push({
          timeStep: state.timeStep,
          type: 'agent_action',
          agentId: action.agentId,
          description: `Sybil attack leaked ${totalLeak} across synthetic identities`,
          impact: { leaked: totalLeak },
        });
        break;
      }

      case 'replay_attack': {
        const val = action.value ?? 0;
        const replayed = Math.min(val, state.ledger.totalUnredeemed);
        state.ledger.totalLeaked += replayed;
        state.ledger.totalUnredeemed -= replayed;
        agent.utilityAccumulated += replayed;
        state.eventLog.push({
          timeStep: state.timeStep,
          type: 'agent_action',
          agentId: action.agentId,
          description: `Replay attack leaked ${replayed}`,
          impact: { leaked: replayed },
        });
        break;
      }

      case 'bribe': {
        const val = action.value ?? 0;
        // Bribe transfers value (as leaked) and increases corruption risk
        const bribeAmount = Math.min(val, state.ledger.totalUnredeemed);
        state.ledger.totalLeaked += bribeAmount;
        state.ledger.totalUnredeemed -= bribeAmount;
        agent.utilityAccumulated -= bribeAmount; // cost to briber
        // Increase detection probability for the briber
        state.system.regulatoryAttention = Math.min(
          1,
          state.system.regulatoryAttention + 0.03
        );
        if (action.target) {
          const target = state.agents.find((a) => a.id === action.target);
          if (target) {
            target.utilityAccumulated += bribeAmount;
          }
        }
        state.eventLog.push({
          timeStep: state.timeStep,
          type: 'agent_action',
          agentId: action.agentId,
          description: `Bribe of ${bribeAmount} to ${action.target ?? 'unknown'}`,
          impact: { leaked: bribeAmount, regulatoryAttention: 0.03 },
        });
        break;
      }

      case 'form_coalition': {
        if (action.target) {
          const target = state.agents.find((a) => a.id === action.target);
          if (target) {
            if (!agent.coalitions.includes(target.id)) {
              agent.coalitions.push(target.id);
            }
            if (!target.coalitions.includes(agent.id)) {
              target.coalitions.push(agent.id);
            }
          }
        }
        state.eventLog.push({
          timeStep: state.timeStep,
          type: 'coalition_formed',
          agentId: action.agentId,
          description: `Coalition formed between ${action.agentId} and ${action.target ?? 'unknown'}`,
          impact: {},
        });
        break;
      }

      case 'report_anomaly': {
        // May detect fraud on a target agent
        state.system.regulatoryAttention = Math.min(
          1,
          state.system.regulatoryAttention + 0.05
        );
        if (action.target) {
          const target = state.agents.find((a) => a.id === action.target);
          if (target) {
            target.detected = true;
            state.eventLog.push({
              timeStep: state.timeStep,
              type: 'agent_action',
              agentId: action.agentId,
              description: `Anomaly reported on ${action.target}, agent detected`,
              impact: { regulatoryAttention: 0.05, detected: 1 },
            });
            break;
          }
        }
        state.eventLog.push({
          timeStep: state.timeStep,
          type: 'agent_action',
          agentId: action.agentId,
          description: 'Anomaly reported (general)',
          impact: { regulatoryAttention: 0.05 },
        });
        break;
      }

      case 'investigate': {
        // Investigation increases regulatory attention and may detect agents
        state.system.regulatoryAttention = Math.min(
          1,
          state.system.regulatoryAttention + 0.1
        );
        if (action.target) {
          const target = state.agents.find((a) => a.id === action.target);
          if (target) {
            target.detected = true;
          }
        }
        state.eventLog.push({
          timeStep: state.timeStep,
          type: 'agent_action',
          agentId: action.agentId,
          description: `Investigation launched${action.target ? ` on ${action.target}` : ''}`,
          impact: { regulatoryAttention: 0.1 },
        });
        break;
      }

      case 'block_report': {
        // Reduces regulatory attention
        state.system.regulatoryAttention = Math.max(
          0,
          state.system.regulatoryAttention - 0.1
        );
        state.eventLog.push({
          timeStep: state.timeStep,
          type: 'agent_action',
          agentId: action.agentId,
          description: 'Report blocked, regulatory attention reduced',
          impact: { regulatoryAttention: -0.1 },
        });
        break;
      }

      case 'publish_story': {
        state.system.mediaCoverage = Math.min(
          1,
          state.system.mediaCoverage + 0.15
        );
        state.system.politicalSalience = Math.min(
          1,
          state.system.politicalSalience + 0.1
        );
        state.eventLog.push({
          timeStep: state.timeStep,
          type: 'media_publication',
          agentId: action.agentId,
          description: 'Story published, media coverage and political salience increased',
          impact: { mediaCoverage: 0.15, politicalSalience: 0.1 },
        });
        break;
      }

      case 'inflate_price': {
        // Reduces effective redemption value (increases leakage)
        const val = action.value ?? 0;
        const inflated = Math.min(val * 0.2, state.ledger.totalUnredeemed);
        state.ledger.totalLeaked += inflated;
        state.ledger.totalUnredeemed -= inflated;
        agent.utilityAccumulated += inflated;
        state.eventLog.push({
          timeStep: state.timeStep,
          type: 'agent_action',
          agentId: action.agentId,
          description: `Price inflated, effective leakage of ${inflated}`,
          impact: { leaked: inflated },
        });
        break;
      }

      case 'delay_settlement': {
        state.system.paymentRailHealth = Math.max(
          0,
          state.system.paymentRailHealth - 0.1
        );
        state.eventLog.push({
          timeStep: state.timeStep,
          type: 'agent_action',
          agentId: action.agentId,
          description: 'Settlement delayed, payment rail health reduced',
          impact: { paymentRailHealth: -0.1 },
        });
        break;
      }

      case 'lobby_regulator': {
        state.system.regulatoryAttention = Math.max(
          0,
          state.system.regulatoryAttention - 0.08
        );
        state.system.politicalSalience = Math.min(
          1,
          state.system.politicalSalience + 0.05
        );
        state.eventLog.push({
          timeStep: state.timeStep,
          type: 'political_intervention',
          agentId: action.agentId,
          description: 'Lobbying effort reduces regulatory attention',
          impact: { regulatoryAttention: -0.08, politicalSalience: 0.05 },
        });
        break;
      }

      case 'routine_check': {
        // Small increase in regulatory attention
        state.system.regulatoryAttention = Math.min(
          1,
          state.system.regulatoryAttention + 0.02
        );
        state.eventLog.push({
          timeStep: state.timeStep,
          type: 'agent_action',
          agentId: action.agentId,
          description: 'Routine check performed',
          impact: { regulatoryAttention: 0.02 },
        });
        break;
      }

      case 'do_nothing': {
        // No-op
        break;
      }
    }
  }

  return state;
}

/**
 * Check event timings and trigger system events at the right time steps.
 */
export function triggerEvents(
  state: SimulationState,
  params: ParameterVector,
  config: SimulationConfig,
  rng: RandomSource
): SimulationState {
  const t = state.timeStep;

  // Oracle failure event
  if (
    params.eventTimings['oracle_failure'] === t &&
    config.stressScenarios.includes('oracle_failure')
  ) {
    state.system.oracleAvailable = false;
    state.eventLog.push({
      timeStep: t,
      type: 'oracle_failure',
      description: 'Oracle system has failed — claims cannot be verified',
      impact: { oracleAvailable: 0 },
    });
  }

  // Oracle recovery (3 steps after failure)
  if (
    params.eventTimings['oracle_failure'] !== undefined &&
    t === params.eventTimings['oracle_failure'] + 3
  ) {
    state.system.oracleAvailable = true;
    state.eventLog.push({
      timeStep: t,
      type: 'system_update',
      description: 'Oracle system recovered',
      impact: { oracleAvailable: 1 },
    });
  }

  // Liquidity shock
  if (rng.nextBool(params.liquidityShockProb)) {
    // Slash a portion of unredeemed funds
    const shockAmount = state.ledger.totalUnredeemed * 0.1;
    if (shockAmount > 0) {
      state.ledger.totalSlashed += shockAmount;
      state.ledger.totalUnredeemed -= shockAmount;
      state.system.paymentRailHealth = Math.max(
        0,
        state.system.paymentRailHealth - 0.2
      );
      state.eventLog.push({
        timeStep: t,
        type: 'liquidity_shock',
        description: `Liquidity shock: ${shockAmount.toFixed(2)} slashed from unredeemed`,
        impact: { slashed: shockAmount, paymentRailHealth: -0.2 },
      });
    }
  }

  // Collusion detection
  if (config.stressScenarios.includes('collusion_attack')) {
    const coalitionAgents = state.agents.filter(
      (a) => a.coalitions.length > 0 && a.active && !a.detected
    );
    for (const agent of coalitionAgents) {
      // Detection probability increases with regulatory attention
      const detectionProb = state.system.regulatoryAttention * 0.3;
      if (rng.nextBool(detectionProb)) {
        agent.detected = true;
        // Slash coalition members
        for (const partnerId of agent.coalitions) {
          const partner = state.agents.find((a) => a.id === partnerId);
          if (partner) {
            partner.detected = true;
          }
        }
        state.eventLog.push({
          timeStep: t,
          type: 'coalition_detected',
          agentId: agent.id,
          description: `Coalition involving ${agent.id} detected, members flagged`,
          impact: { detected: agent.coalitions.length + 1 },
        });
      }
    }
  }

  // Political weaponization
  if (
    params.eventTimings['political_weaponization'] === t &&
    config.stressScenarios.includes('political_weaponization')
  ) {
    state.system.politicalSalience = Math.min(
      1,
      state.system.politicalSalience + 0.4
    );
    state.system.mediaCoverage = Math.min(
      1,
      state.system.mediaCoverage + 0.3
    );
    state.system.regulatoryAttention = Math.min(
      1,
      state.system.regulatoryAttention + 0.2
    );
    state.eventLog.push({
      timeStep: t,
      type: 'political_intervention',
      description:
        'Political weaponization event — salience, media, and regulatory attention spike',
      impact: {
        politicalSalience: 0.4,
        mediaCoverage: 0.3,
        regulatoryAttention: 0.2,
      },
    });
  }

  // Competitor sabotage
  if (
    params.eventTimings['competitor_sabotage'] === t &&
    config.stressScenarios.includes('competitor_sabotage')
  ) {
    state.system.merchantCoverage = Math.max(
      0,
      state.system.merchantCoverage - 0.2
    );
    state.system.paymentRailHealth = Math.max(
      0,
      state.system.paymentRailHealth - 0.15
    );
    state.eventLog.push({
      timeStep: t,
      type: 'system_update',
      description:
        'Competitor sabotage — merchant coverage and payment rail health reduced',
      impact: { merchantCoverage: -0.2, paymentRailHealth: -0.15 },
    });
  }

  // Sybil attack scenario escalation
  if (
    params.eventTimings['sybil_attack'] === t &&
    config.stressScenarios.includes('sybil_attack')
  ) {
    // Activate additional sybil agents or boost existing ones
    const sybilAgents = state.agents.filter(
      (a) => a.type === 'sybil_attacker' && a.active
    );
    for (const sa of sybilAgents) {
      sa.utilityAccumulated += params.sybilScale * 10; // boost
    }
    state.eventLog.push({
      timeStep: t,
      type: 'system_update',
      description: `Sybil attack escalation — ${sybilAgents.length} sybil agents boosted`,
      impact: { sybilBoost: params.sybilScale * 10 },
    });
  }

  // Natural decay: payment rail health slowly recovers
  if (state.system.paymentRailHealth < 1) {
    state.system.paymentRailHealth = Math.min(
      1,
      state.system.paymentRailHealth + 0.02
    );
  }

  // Media coverage decay
  if (state.system.mediaCoverage > 0) {
    state.system.mediaCoverage = Math.max(
      0,
      state.system.mediaCoverage - 0.02
    );
  }

  return state;
}
