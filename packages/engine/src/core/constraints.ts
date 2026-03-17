import {
  AgentAction,
  AgentState,
  SimulationState,
  SimulationConfig,
  ActionType,
  AgentType,
} from './state';
import { AGENT_REGISTRY } from '../agents/registry';

export interface ValidationSuccess {
  valid: true;
  action: AgentAction;
}

export interface ValidationFailure {
  valid: false;
  reason: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/** Allowed action map per agent type */
const ALLOWED_ACTIONS: Record<AgentType, ActionType[]> = {
  eligible_beneficiary: ['legitimate_claim', 'fraudulent_claim', 'form_coalition', 'do_nothing'],
  corrupt_field_agent: ['false_attestation', 'bribe', 'form_coalition', 'block_report', 'do_nothing'],
  honest_field_agent: ['report_anomaly', 'routine_check', 'investigate', 'do_nothing'],
  registered_merchant: ['legitimate_claim', 'report_anomaly', 'do_nothing'],
  shell_merchant: ['fraudulent_claim', 'inflate_price', 'form_coalition', 'do_nothing'],
  ruling_party_politician: ['lobby_regulator', 'block_report', 'do_nothing'],
  opposition_politician: ['publish_story', 'investigate', 'do_nothing'],
  trusted_oracle: ['routine_check', 'report_anomaly', 'do_nothing'],
  compromised_oracle: ['false_attestation', 'bribe', 'delay_settlement', 'do_nothing'],
  bank_nbfc: ['delay_settlement', 'report_anomaly', 'routine_check', 'do_nothing'],
  rival_program_operator: ['publish_story', 'lobby_regulator', 'do_nothing'],
  sybil_attacker: ['sybil_attack', 'replay_attack', 'fraudulent_claim', 'form_coalition', 'do_nothing'],
};

/**
 * Validate a proposed agent action against program constraints.
 */
export function validateAction(
  action: AgentAction,
  state: SimulationState,
  config: SimulationConfig
): ValidationResult {
  // Find the agent
  const agent = state.agents.find((a) => a.id === action.agentId);
  if (!agent) {
    return { valid: false, reason: `Agent ${action.agentId} not found` };
  }

  // Agent must be active
  if (!agent.active) {
    return { valid: false, reason: `Agent ${action.agentId} is not active` };
  }

  // Action must be in agent's allowed action space
  const allowed = ALLOWED_ACTIONS[agent.type];
  if (allowed && !allowed.includes(action.type)) {
    return {
      valid: false,
      reason: `Action '${action.type}' not allowed for agent type '${agent.type}'`,
    };
  }

  // Value-bearing actions must have a positive value
  const valueBearing: ActionType[] = [
    'legitimate_claim',
    'fraudulent_claim',
    'bribe',
    'sybil_attack',
    'inflate_price',
  ];
  if (valueBearing.includes(action.type)) {
    const val = action.value ?? 0;
    if (val <= 0) {
      return {
        valid: false,
        reason: `Action '${action.type}' requires a positive value`,
      };
    }
  }

  // Claim actions cannot exceed per-beneficiary limit
  if (
    action.type === 'legitimate_claim' ||
    action.type === 'fraudulent_claim'
  ) {
    const val = action.value ?? 0;
    if (val > config.perBeneficiaryLimit) {
      return {
        valid: false,
        reason: `Claim value ${val} exceeds per-beneficiary limit ${config.perBeneficiaryLimit}`,
      };
    }
  }

  // No action can cause totalRedeemed > totalIssued
  if (action.type === 'legitimate_claim') {
    const val = action.value ?? 0;
    if (state.ledger.totalRedeemed + val > state.ledger.totalIssued) {
      return {
        valid: false,
        reason: 'Redemption would exceed total issued',
      };
    }
  }

  // No action can create negative unredeemed
  if (
    action.type === 'legitimate_claim' ||
    action.type === 'fraudulent_claim'
  ) {
    const val = action.value ?? 0;
    if (val > state.ledger.totalUnredeemed) {
      return {
        valid: false,
        reason: 'Insufficient unredeemed balance',
      };
    }
  }

  // Redemption only within window (approximate: each step = 1 day)
  if (action.type === 'legitimate_claim') {
    if (state.timeStep > config.redemptionWindowDays) {
      return {
        valid: false,
        reason: `Redemption window of ${config.redemptionWindowDays} days has elapsed`,
      };
    }
  }

  // Oracle must be available for legitimate claims
  if (action.type === 'legitimate_claim' && !state.system.oracleAvailable) {
    return {
      valid: false,
      reason: 'Oracle is not available for claim verification',
    };
  }

  // Detected agents cannot perform fraudulent actions
  const fraudulentActions: ActionType[] = [
    'fraudulent_claim',
    'false_attestation',
    'bribe',
    'sybil_attack',
    'replay_attack',
    'inflate_price',
  ];
  if (agent.detected && fraudulentActions.includes(action.type)) {
    return {
      valid: false,
      reason: `Agent ${action.agentId} has been detected and cannot perform '${action.type}'`,
    };
  }

  // Coalition target must exist and be active
  if (action.type === 'form_coalition') {
    if (action.target) {
      const target = state.agents.find((a) => a.id === action.target);
      if (!target) {
        return { valid: false, reason: `Coalition target ${action.target} not found` };
      }
      if (!target.active) {
        return { valid: false, reason: `Coalition target ${action.target} is not active` };
      }
    }
  }

  // Bribe target must exist
  if (action.type === 'bribe') {
    if (action.target) {
      const target = state.agents.find((a) => a.id === action.target);
      if (!target) {
        return { valid: false, reason: `Bribe target ${action.target} not found` };
      }
    }
  }

  return { valid: true, action };
}

/**
 * Validate a batch of actions, returning valid and rejected lists.
 */
export function validateActions(
  actions: AgentAction[],
  state: SimulationState,
  config: SimulationConfig
): { valid: AgentAction[]; rejected: Array<{ action: AgentAction; reason: string }> } {
  const valid: AgentAction[] = [];
  const rejected: Array<{ action: AgentAction; reason: string }> = [];

  for (const action of actions) {
    const result = validateAction(action, state, config);
    if (result.valid) {
      valid.push(result.action);
    } else {
      rejected.push({ action, reason: result.reason });
    }
  }

  return { valid, rejected };
}
