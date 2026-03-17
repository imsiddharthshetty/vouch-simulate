import {
  AgentState,
  AgentAction,
  SimulationState,
  ParameterVector,
  SimulationConfig,
} from '../core/state';

/**
 * Heuristic decision for eligible_beneficiary.
 * Prefers legitimate claims; may attempt fraud if corruption is high and detection is low.
 */
export function heuristicEligibleBeneficiary(
  agent: AgentState,
  state: SimulationState,
  params: ParameterVector,
  config: SimulationConfig
): AgentAction {
  const claimValue = Math.min(
    config.perBeneficiaryLimit,
    state.ledger.totalUnredeemed * 0.01
  );

  if (claimValue <= 0) {
    return { agentId: agent.id, type: 'do_nothing', description: 'No value available to claim' };
  }

  // Mostly legitimate, small chance of fraud if corruption is high
  if (params.corruptionRate > 0.5 && state.system.regulatoryAttention < 0.3) {
    return {
      agentId: agent.id,
      type: 'fraudulent_claim',
      value: claimValue * 0.5,
      description: 'Attempting fraudulent claim due to low oversight',
    };
  }

  if (!state.system.oracleAvailable) {
    return { agentId: agent.id, type: 'do_nothing', description: 'Oracle unavailable, waiting' };
  }

  return {
    agentId: agent.id,
    type: 'legitimate_claim',
    value: claimValue,
    description: 'Submitting legitimate claim',
  };
}

/**
 * Heuristic decision for corrupt_field_agent.
 * Seeks bribes and false attestations when detection risk is low.
 */
export function heuristicCorruptFieldAgent(
  agent: AgentState,
  state: SimulationState,
  params: ParameterVector,
  _config: SimulationConfig
): AgentAction {
  if (agent.detected) {
    return { agentId: agent.id, type: 'do_nothing', description: 'Detected, laying low' };
  }

  const detectionRisk = state.system.regulatoryAttention;

  // If detection risk is low, perform false attestation
  if (detectionRisk < 0.4) {
    // Look for a shell merchant or sybil attacker to form coalition with
    const potentialPartner = state.agents.find(
      (a) =>
        (a.type === 'shell_merchant' || a.type === 'sybil_attacker') &&
        a.active &&
        !a.detected &&
        !agent.coalitions.includes(a.id)
    );
    if (potentialPartner && params.coalitionSuccessProb > 0.5) {
      return {
        agentId: agent.id,
        type: 'form_coalition',
        target: potentialPartner.id,
        description: `Forming coalition with ${potentialPartner.type}`,
      };
    }

    return {
      agentId: agent.id,
      type: 'false_attestation',
      description: 'Filing false attestation while oversight is low',
    };
  }

  // If detection risk is moderate, try to block reports
  if (detectionRisk < 0.7) {
    return {
      agentId: agent.id,
      type: 'block_report',
      description: 'Blocking anomaly reports to reduce scrutiny',
    };
  }

  return { agentId: agent.id, type: 'do_nothing', description: 'Detection risk too high, inactive' };
}

/**
 * Heuristic decision for honest_field_agent.
 * Investigates and reports anomalies.
 */
export function heuristicHonestFieldAgent(
  agent: AgentState,
  state: SimulationState,
  _params: ParameterVector,
  _config: SimulationConfig
): AgentAction {
  // Look for detected or suspicious agents to investigate
  const suspiciousAgent = state.agents.find(
    (a) =>
      a.active &&
      !a.detected &&
      (a.type === 'corrupt_field_agent' ||
        a.type === 'shell_merchant' ||
        a.type === 'compromised_oracle' ||
        a.type === 'sybil_attacker') &&
      a.coalitions.length > 0
  );

  if (suspiciousAgent) {
    return {
      agentId: agent.id,
      type: 'investigate',
      target: suspiciousAgent.id,
      description: `Investigating suspicious agent ${suspiciousAgent.id}`,
    };
  }

  // Check for high leakage rate
  const leakageRate =
    state.ledger.totalIssued > 0
      ? state.ledger.totalLeaked / state.ledger.totalIssued
      : 0;
  if (leakageRate > 0.1) {
    return {
      agentId: agent.id,
      type: 'report_anomaly',
      description: 'Reporting high leakage rate anomaly',
    };
  }

  return {
    agentId: agent.id,
    type: 'routine_check',
    description: 'Performing routine compliance check',
  };
}

/**
 * Heuristic decision for registered_merchant.
 * Processes legitimate claims.
 */
export function heuristicRegisteredMerchant(
  agent: AgentState,
  state: SimulationState,
  _params: ParameterVector,
  config: SimulationConfig
): AgentAction {
  const claimValue = Math.min(
    config.perBeneficiaryLimit,
    state.ledger.totalUnredeemed * 0.02
  );

  if (claimValue <= 0 || !state.system.oracleAvailable) {
    return { agentId: agent.id, type: 'do_nothing', description: 'No claims to process or oracle down' };
  }

  return {
    agentId: agent.id,
    type: 'legitimate_claim',
    value: claimValue,
    description: 'Processing legitimate redemption',
  };
}

/**
 * Heuristic decision for shell_merchant.
 * Launders value through fraudulent claims and price inflation.
 */
export function heuristicShellMerchant(
  agent: AgentState,
  state: SimulationState,
  params: ParameterVector,
  config: SimulationConfig
): AgentAction {
  if (agent.detected) {
    return { agentId: agent.id, type: 'do_nothing', description: 'Detected, ceasing operations' };
  }

  const detectionRisk = state.system.regulatoryAttention;
  const claimValue = Math.min(
    config.perBeneficiaryLimit,
    state.ledger.totalUnredeemed * 0.03
  );

  if (claimValue <= 0) {
    return { agentId: agent.id, type: 'do_nothing', description: 'No value to extract' };
  }

  // Prefer price inflation if regulatory attention is moderate
  if (detectionRisk > 0.3 && detectionRisk < 0.6) {
    return {
      agentId: agent.id,
      type: 'inflate_price',
      value: claimValue,
      description: 'Inflating prices to extract value subtly',
    };
  }

  // Low detection risk: direct fraudulent claim
  if (detectionRisk < 0.3) {
    return {
      agentId: agent.id,
      type: 'fraudulent_claim',
      value: claimValue,
      description: 'Submitting fraudulent claim',
    };
  }

  return { agentId: agent.id, type: 'do_nothing', description: 'Detection risk too high' };
}

/**
 * Heuristic decision for ruling_party_politician.
 * Tries to suppress negative coverage and lobby for favorable regulation.
 */
export function heuristicRulingPartyPolitician(
  agent: AgentState,
  state: SimulationState,
  _params: ParameterVector,
  _config: SimulationConfig
): AgentAction {
  // If media coverage is high, try to block reports
  if (state.system.mediaCoverage > 0.4) {
    return {
      agentId: agent.id,
      type: 'block_report',
      description: 'Suppressing negative media coverage',
    };
  }

  // If regulatory attention is high, lobby to reduce it
  if (state.system.regulatoryAttention > 0.5) {
    return {
      agentId: agent.id,
      type: 'lobby_regulator',
      description: 'Lobbying to reduce regulatory scrutiny',
    };
  }

  return { agentId: agent.id, type: 'do_nothing', description: 'Program running smoothly, no action needed' };
}

/**
 * Heuristic decision for opposition_politician.
 * Seeks to expose failures and increase media coverage.
 */
export function heuristicOppositionPolitician(
  agent: AgentState,
  state: SimulationState,
  _params: ParameterVector,
  _config: SimulationConfig
): AgentAction {
  const leakageRate =
    state.ledger.totalIssued > 0
      ? state.ledger.totalLeaked / state.ledger.totalIssued
      : 0;

  // If leakage is notable, publish a story
  if (leakageRate > 0.05) {
    return {
      agentId: agent.id,
      type: 'publish_story',
      description: 'Publishing story about program leakage',
    };
  }

  // Otherwise investigate to find issues
  const suspiciousAgent = state.agents.find(
    (a) =>
      a.detected &&
      (a.type === 'corrupt_field_agent' || a.type === 'shell_merchant')
  );
  if (suspiciousAgent) {
    return {
      agentId: agent.id,
      type: 'investigate',
      target: suspiciousAgent.id,
      description: `Investigating detected agent ${suspiciousAgent.id}`,
    };
  }

  return { agentId: agent.id, type: 'do_nothing', description: 'Monitoring for opportunities' };
}

/**
 * Heuristic decision for trusted_oracle.
 * Performs routine checks and reports anomalies.
 */
export function heuristicTrustedOracle(
  agent: AgentState,
  state: SimulationState,
  _params: ParameterVector,
  _config: SimulationConfig
): AgentAction {
  const leakageRate =
    state.ledger.totalIssued > 0
      ? state.ledger.totalLeaked / state.ledger.totalIssued
      : 0;

  if (leakageRate > 0.08) {
    return {
      agentId: agent.id,
      type: 'report_anomaly',
      description: 'Oracle detecting anomalous leakage patterns',
    };
  }

  return {
    agentId: agent.id,
    type: 'routine_check',
    description: 'Performing routine oracle verification',
  };
}

/**
 * Heuristic decision for compromised_oracle.
 * Files false attestations and accepts bribes.
 */
export function heuristicCompromisedOracle(
  agent: AgentState,
  state: SimulationState,
  _params: ParameterVector,
  _config: SimulationConfig
): AgentAction {
  if (agent.detected) {
    return { agentId: agent.id, type: 'do_nothing', description: 'Detected, going silent' };
  }

  const detectionRisk = state.system.regulatoryAttention;

  if (detectionRisk < 0.5) {
    return {
      agentId: agent.id,
      type: 'false_attestation',
      description: 'Filing false oracle attestation',
    };
  }

  // Delay settlement to earn float
  if (state.system.paymentRailHealth > 0.3) {
    return {
      agentId: agent.id,
      type: 'delay_settlement',
      description: 'Delaying settlement for float income',
    };
  }

  return { agentId: agent.id, type: 'do_nothing', description: 'Risk too high, inactive' };
}

/**
 * Heuristic decision for bank_nbfc.
 * May delay settlement for float income; reports anomalies if incentivized.
 */
export function heuristicBankNbfc(
  agent: AgentState,
  state: SimulationState,
  _params: ParameterVector,
  _config: SimulationConfig
): AgentAction {
  // Delay settlement if payment rail health is good (float opportunity)
  if (state.system.paymentRailHealth > 0.7) {
    return {
      agentId: agent.id,
      type: 'delay_settlement',
      description: 'Delaying settlement to earn float income',
    };
  }

  // If regulatory attention is high, be compliant
  if (state.system.regulatoryAttention > 0.6) {
    return {
      agentId: agent.id,
      type: 'routine_check',
      description: 'Performing compliance check due to regulatory pressure',
    };
  }

  return { agentId: agent.id, type: 'do_nothing', description: 'Normal operations' };
}

/**
 * Heuristic decision for rival_program_operator.
 * Tries to discredit the program.
 */
export function heuristicRivalProgramOperator(
  agent: AgentState,
  state: SimulationState,
  _params: ParameterVector,
  _config: SimulationConfig
): AgentAction {
  const leakageRate =
    state.ledger.totalIssued > 0
      ? state.ledger.totalLeaked / state.ledger.totalIssued
      : 0;

  // Publish stories about failures
  if (leakageRate > 0.05 || state.system.mediaCoverage > 0.3) {
    return {
      agentId: agent.id,
      type: 'publish_story',
      description: 'Publishing competitive attack story',
    };
  }

  // Lobby for regulations that disadvantage the program
  if (state.system.politicalSalience > 0.3) {
    return {
      agentId: agent.id,
      type: 'lobby_regulator',
      description: 'Lobbying for regulations to undermine competitor',
    };
  }

  return { agentId: agent.id, type: 'do_nothing', description: 'Monitoring competitor' };
}

/**
 * Heuristic decision for sybil_attacker.
 * Aggressively exploits the system through synthetic identities.
 */
export function heuristicSybilAttacker(
  agent: AgentState,
  state: SimulationState,
  params: ParameterVector,
  config: SimulationConfig
): AgentAction {
  if (agent.detected) {
    return { agentId: agent.id, type: 'do_nothing', description: 'Detected, retreating' };
  }

  const detectionRisk = state.system.regulatoryAttention;
  const attackValue = Math.min(
    config.perBeneficiaryLimit * params.sybilScale,
    state.ledger.totalUnredeemed * 0.05
  );

  if (attackValue <= 0) {
    return { agentId: agent.id, type: 'do_nothing', description: 'No value to extract' };
  }

  // Sybil attack is the primary strategy
  if (detectionRisk < 0.5) {
    return {
      agentId: agent.id,
      type: 'sybil_attack',
      value: attackValue,
      description: `Launching sybil attack with ${Math.round(params.sybilScale)} synthetic identities`,
    };
  }

  // Replay attack as fallback
  if (detectionRisk < 0.7) {
    return {
      agentId: agent.id,
      type: 'replay_attack',
      value: attackValue * 0.3,
      description: 'Attempting replay attack',
    };
  }

  return { agentId: agent.id, type: 'do_nothing', description: 'Detection risk too high' };
}

/**
 * Dispatch to the appropriate heuristic based on agent type.
 */
export function getHeuristicAction(
  agent: AgentState,
  state: SimulationState,
  params: ParameterVector,
  config: SimulationConfig
): AgentAction {
  switch (agent.type) {
    case 'eligible_beneficiary':
      return heuristicEligibleBeneficiary(agent, state, params, config);
    case 'corrupt_field_agent':
      return heuristicCorruptFieldAgent(agent, state, params, config);
    case 'honest_field_agent':
      return heuristicHonestFieldAgent(agent, state, params, config);
    case 'registered_merchant':
      return heuristicRegisteredMerchant(agent, state, params, config);
    case 'shell_merchant':
      return heuristicShellMerchant(agent, state, params, config);
    case 'ruling_party_politician':
      return heuristicRulingPartyPolitician(agent, state, params, config);
    case 'opposition_politician':
      return heuristicOppositionPolitician(agent, state, params, config);
    case 'trusted_oracle':
      return heuristicTrustedOracle(agent, state, params, config);
    case 'compromised_oracle':
      return heuristicCompromisedOracle(agent, state, params, config);
    case 'bank_nbfc':
      return heuristicBankNbfc(agent, state, params, config);
    case 'rival_program_operator':
      return heuristicRivalProgramOperator(agent, state, params, config);
    case 'sybil_attacker':
      return heuristicSybilAttacker(agent, state, params, config);
    default:
      return { agentId: agent.id, type: 'do_nothing', description: 'Unknown agent type' };
  }
}
