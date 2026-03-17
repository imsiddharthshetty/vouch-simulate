import { ProgramType, Faction, StressScenario, ParameterDistributions } from '../core/state';

export interface ProgramDefinition {
  type: ProgramType;
  name: string;
  description: string;
  activeFactions: Faction[];
  suggestedStressScenarios: StressScenario[];
  defaultDistributions: ParameterDistributions;
  typicalRedemptionWindowDays: number;
  typicalSlashingConditions: string[];
}

export const PROGRAM_CATALOG: Map<ProgramType, ProgramDefinition> = new Map([
  [
    'govt_subsidy',
    {
      type: 'govt_subsidy',
      name: 'Government Subsidy',
      description:
        'Government-run subsidy program distributing fiat vouchers to eligible beneficiaries. High political salience, field agent dependency, and regulatory framework.',
      activeFactions: [
        'beneficiaries',
        'field_ops',
        'merchants',
        'political_media',
        'oracles',
        'financial_rails',
      ],
      suggestedStressScenarios: [
        'oracle_failure',
        'collusion_attack',
        'political_weaponization',
        'sybil_attack',
      ],
      defaultDistributions: {
        corruptionRate: { alpha: 2, beta: 4 },
        oracleFailureProb: 0.1,
        coalitionSuccessProb: 0.5,
        merchantCoverage: { alpha: 3, beta: 4 },
        adversaryDensity: 3,
        politicalSalience: 0.7,
        liquidityShockProb: 0.05,
        sybilScale: 2.5,
      },
      typicalRedemptionWindowDays: 90,
      typicalSlashingConditions: [
        'duplicate_claim_detected',
        'identity_mismatch',
        'expired_voucher',
        'merchant_not_registered',
      ],
    },
  ],
  [
    'corporate_voucher',
    {
      type: 'corporate_voucher',
      name: 'Corporate Voucher',
      description:
        'Corporate-issued vouchers for employee benefits, partner incentives, or customer rewards. Lower political risk but potential for internal fraud.',
      activeFactions: [
        'beneficiaries',
        'merchants',
        'oracles',
        'financial_rails',
        'competitors',
      ],
      suggestedStressScenarios: [
        'oracle_failure',
        'collusion_attack',
        'competitor_sabotage',
      ],
      defaultDistributions: {
        corruptionRate: { alpha: 5, beta: 8 },
        oracleFailureProb: 0.05,
        coalitionSuccessProb: 0.3,
        merchantCoverage: { alpha: 6, beta: 3 },
        adversaryDensity: 1.5,
        politicalSalience: 0.2,
        liquidityShockProb: 0.03,
        sybilScale: 1.5,
      },
      typicalRedemptionWindowDays: 365,
      typicalSlashingConditions: [
        'duplicate_redemption',
        'expired_voucher',
        'unauthorized_transfer',
      ],
    },
  ],
  [
    'ngo_aid',
    {
      type: 'ngo_aid',
      name: 'NGO Aid Distribution',
      description:
        'Humanitarian aid distribution through NGO channels. High field dependency, limited infrastructure, diversion risk through intermediaries.',
      activeFactions: [
        'beneficiaries',
        'field_ops',
        'merchants',
        'political_media',
        'oracles',
        'financial_rails',
      ],
      suggestedStressScenarios: [
        'oracle_failure',
        'collusion_attack',
        'liquidity_crunch',
        'cold_start',
      ],
      defaultDistributions: {
        corruptionRate: { alpha: 2, beta: 3 },
        oracleFailureProb: 0.15,
        coalitionSuccessProb: 0.55,
        merchantCoverage: { alpha: 2, beta: 5 },
        adversaryDensity: 2.5,
        politicalSalience: 0.5,
        liquidityShockProb: 0.1,
        sybilScale: 2.0,
      },
      typicalRedemptionWindowDays: 60,
      typicalSlashingConditions: [
        'duplicate_claim_detected',
        'identity_mismatch',
        'geographic_anomaly',
        'expired_voucher',
      ],
    },
  ],
  [
    'b2b_trade_finance',
    {
      type: 'b2b_trade_finance',
      name: 'B2B Trade Finance',
      description:
        'Business-to-business trade finance instruments. Invoice factoring, supply chain finance. Higher values, sophisticated actors.',
      activeFactions: [
        'merchants',
        'oracles',
        'financial_rails',
        'competitors',
      ],
      suggestedStressScenarios: [
        'oracle_failure',
        'liquidity_crunch',
        'competitor_sabotage',
        'collusion_attack',
      ],
      defaultDistributions: {
        corruptionRate: { alpha: 6, beta: 8 },
        oracleFailureProb: 0.04,
        coalitionSuccessProb: 0.25,
        merchantCoverage: { alpha: 7, beta: 2 },
        adversaryDensity: 1,
        politicalSalience: 0.15,
        liquidityShockProb: 0.06,
        sybilScale: 1.3,
      },
      typicalRedemptionWindowDays: 180,
      typicalSlashingConditions: [
        'invoice_fraud_detected',
        'duplicate_invoice',
        'counterparty_default',
        'settlement_timeout',
      ],
    },
  ],
  [
    'agentic_commerce',
    {
      type: 'agentic_commerce',
      name: 'Agentic Commerce',
      description:
        'AI-agent-driven commerce where autonomous agents transact on behalf of users. High sybil risk, novel attack vectors, minimal human oversight.',
      activeFactions: [
        'beneficiaries',
        'merchants',
        'oracles',
        'financial_rails',
        'ai_adversarial',
        'competitors',
      ],
      suggestedStressScenarios: [
        'sybil_attack',
        'oracle_failure',
        'collusion_attack',
        'competitor_sabotage',
      ],
      defaultDistributions: {
        corruptionRate: { alpha: 4, beta: 6 },
        oracleFailureProb: 0.08,
        coalitionSuccessProb: 0.45,
        merchantCoverage: { alpha: 5, beta: 3 },
        adversaryDensity: 4,
        politicalSalience: 0.3,
        liquidityShockProb: 0.04,
        sybilScale: 3.5,
      },
      typicalRedemptionWindowDays: 30,
      typicalSlashingConditions: [
        'bot_detection',
        'velocity_anomaly',
        'replay_detected',
        'unauthorized_agent',
      ],
    },
  ],
]);

/**
 * Get the program definition for a given type.
 */
export function getProgramDefinition(
  type: ProgramType
): ProgramDefinition | undefined {
  return PROGRAM_CATALOG.get(type);
}
