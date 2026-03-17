import { AgentType, Faction } from '../core/state';
import { AgentDefinition } from './types';

export const AGENT_REGISTRY: Map<AgentType, AgentDefinition> = new Map([
  [
    'eligible_beneficiary',
    {
      type: 'eligible_beneficiary',
      faction: 'beneficiaries',
      description:
        'A genuine beneficiary eligible for program vouchers. Seeks to maximize value received with minimum effort.',
      utilityFunction: 'Maximize value received minus effort and risk of rejection',
      allowedActions: [
        'legitimate_claim',
        'fraudulent_claim',
        'form_coalition',
        'do_nothing',
      ],
      defaultRiskTolerance: 0.2,
      contextVariable: 'literacy_rate',
    },
  ],
  [
    'corrupt_field_agent',
    {
      type: 'corrupt_field_agent',
      faction: 'field_ops',
      description:
        'A field agent who accepts bribes in exchange for false attestations. Seeks to maximize bribe income while minimizing detection risk.',
      utilityFunction: 'Maximize bribe income minus detection risk penalty',
      allowedActions: [
        'false_attestation',
        'bribe',
        'form_coalition',
        'block_report',
        'do_nothing',
      ],
      defaultRiskTolerance: 0.6,
      contextVariable: 'field_agent_salary',
    },
  ],
  [
    'honest_field_agent',
    {
      type: 'honest_field_agent',
      faction: 'field_ops',
      description:
        'A field agent who performs legitimate attestation and reporting. Seeks to maximize accuracy and compliance.',
      utilityFunction: 'Maximize attestation accuracy and anomaly detection',
      allowedActions: [
        'report_anomaly',
        'routine_check',
        'investigate',
        'do_nothing',
      ],
      defaultRiskTolerance: 0.1,
      contextVariable: 'field_agent_salary',
    },
  ],
  [
    'registered_merchant',
    {
      type: 'registered_merchant',
      faction: 'merchants',
      description:
        'A legitimate merchant registered to accept program vouchers. Seeks to maximize redemption volume.',
      utilityFunction: 'Maximize legitimate redemption volume and customer flow',
      allowedActions: ['legitimate_claim', 'report_anomaly', 'do_nothing'],
      defaultRiskTolerance: 0.15,
      contextVariable: 'merchant_density',
    },
  ],
  [
    'shell_merchant',
    {
      type: 'shell_merchant',
      faction: 'merchants',
      description:
        'A fraudulent merchant entity used to launder voucher value. Seeks to maximize laundered value while avoiding investigation.',
      utilityFunction:
        'Maximize laundered value minus investigation risk and setup cost',
      allowedActions: [
        'fraudulent_claim',
        'inflate_price',
        'form_coalition',
        'do_nothing',
      ],
      defaultRiskTolerance: 0.7,
      contextVariable: 'merchant_regulation_stringency',
    },
  ],
  [
    'ruling_party_politician',
    {
      type: 'ruling_party_politician',
      faction: 'political_media',
      description:
        'A politician from the ruling party who wants the program to succeed (or appear to). May suppress negative reports.',
      utilityFunction: 'Maximize program credit and public approval',
      allowedActions: ['lobby_regulator', 'block_report', 'do_nothing'],
      defaultRiskTolerance: 0.4,
      contextVariable: 'election_proximity',
    },
  ],
  [
    'opposition_politician',
    {
      type: 'opposition_politician',
      faction: 'political_media',
      description:
        'A politician from the opposition who wants to expose program failures. Seeks to maximize scandal visibility.',
      utilityFunction: 'Maximize scandal exposure times media reach',
      allowedActions: ['publish_story', 'investigate', 'do_nothing'],
      defaultRiskTolerance: 0.3,
      contextVariable: 'election_proximity',
    },
  ],
  [
    'trusted_oracle',
    {
      type: 'trusted_oracle',
      faction: 'oracles',
      description:
        'A reliable oracle providing truthful attestation data. Seeks to maintain accuracy and uptime.',
      utilityFunction: 'Maximize attestation accuracy and system reliability',
      allowedActions: ['routine_check', 'report_anomaly', 'do_nothing'],
      defaultRiskTolerance: 0.05,
      contextVariable: 'oracle_infrastructure_quality',
    },
  ],
  [
    'compromised_oracle',
    {
      type: 'compromised_oracle',
      faction: 'oracles',
      description:
        'An oracle that has been compromised and provides false attestation data for payment. Seeks to maximize bribe income.',
      utilityFunction: 'Maximize bribe income minus detection risk',
      allowedActions: [
        'false_attestation',
        'bribe',
        'delay_settlement',
        'do_nothing',
      ],
      defaultRiskTolerance: 0.65,
      contextVariable: 'oracle_infrastructure_quality',
    },
  ],
  [
    'bank_nbfc',
    {
      type: 'bank_nbfc',
      faction: 'financial_rails',
      description:
        'A bank or NBFC handling payment settlement. Seeks to maximize float income and fee revenue, may delay settlement.',
      utilityFunction: 'Maximize float income and fee revenue',
      allowedActions: [
        'delay_settlement',
        'report_anomaly',
        'routine_check',
        'do_nothing',
      ],
      defaultRiskTolerance: 0.3,
      contextVariable: 'financial_regulation_regime',
    },
  ],
  [
    'rival_program_operator',
    {
      type: 'rival_program_operator',
      faction: 'competitors',
      description:
        'A competitor running a rival program. Seeks to capture beneficiaries and undermine this program.',
      utilityFunction: 'Maximize beneficiary capture and competitor discrediting',
      allowedActions: ['publish_story', 'lobby_regulator', 'do_nothing'],
      defaultRiskTolerance: 0.35,
      contextVariable: 'market_competition_level',
    },
  ],
  [
    'sybil_attacker',
    {
      type: 'sybil_attacker',
      faction: 'ai_adversarial',
      description:
        'An AI-driven attacker creating synthetic identities to drain program funds. Seeks to maximize extraction volume.',
      utilityFunction: 'Maximize synthetic identity volume and extraction rate',
      allowedActions: [
        'sybil_attack',
        'replay_attack',
        'fraudulent_claim',
        'form_coalition',
        'do_nothing',
      ],
      defaultRiskTolerance: 0.8,
      contextVariable: 'identity_verification_strength',
    },
  ],
]);

/**
 * Get all agent definitions for a given faction.
 */
export function getAgentsByFaction(faction: Faction): AgentDefinition[] {
  const result: AgentDefinition[] = [];
  for (const def of AGENT_REGISTRY.values()) {
    if (def.faction === faction) {
      result.push(def);
    }
  }
  return result;
}

/**
 * Get agent definitions relevant for a given context (country, program type, adversary intensity).
 * Returns a subset of agents that should be active in this simulation.
 */
export function getAgentsForContext(
  programType: string,
  adversaryIntensity: 'low' | 'medium' | 'high'
): AgentDefinition[] {
  const all = Array.from(AGENT_REGISTRY.values());

  // Always include beneficiaries, field ops, merchants, oracles, financial rails
  const core = all.filter((a) =>
    ['beneficiaries', 'field_ops', 'merchants', 'oracles', 'financial_rails'].includes(a.faction)
  );

  // Include political_media only for govt programs or if adversary intensity is medium+
  const political = all.filter((a) => a.faction === 'political_media');
  const includesPolitical =
    programType === 'govt_subsidy' ||
    programType === 'ngo_aid' ||
    adversaryIntensity !== 'low';

  // Include competitors and AI adversaries based on intensity
  const competitors = all.filter((a) => a.faction === 'competitors');
  const aiAdversarial = all.filter((a) => a.faction === 'ai_adversarial');

  const result = [...core];

  if (includesPolitical) {
    result.push(...political);
  }

  if (adversaryIntensity === 'medium' || adversaryIntensity === 'high') {
    result.push(...competitors);
  }

  if (adversaryIntensity === 'high') {
    result.push(...aiAdversarial);
  }

  return result;
}
