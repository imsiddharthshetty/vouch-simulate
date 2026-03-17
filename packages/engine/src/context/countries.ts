import { ParameterDistributions } from '../core/state';

export interface CountryContext {
  country: string;
  region: string;
  description: string;
  parameterOverrides: Partial<ParameterDistributions>;
  availableOracleTypes: string[];
  paymentRails: string[];
  agentBehaviorModifiers: Record<string, number>;
  defaultCurrency: string;
}

export const COUNTRY_CATALOG: Map<string, CountryContext> = new Map([
  [
    'india_bihar',
    {
      country: 'India',
      region: 'Bihar (Rural)',
      description:
        'Rural Bihar — high corruption baseline, low digital literacy, weak oracle infrastructure. Government subsidy programs face significant leakage through field agent networks.',
      parameterOverrides: {
        corruptionRate: { alpha: 2, beta: 3 },
        oracleFailureProb: 0.15,
        coalitionSuccessProb: 0.6,
        merchantCoverage: { alpha: 2, beta: 5 },
        adversaryDensity: 3,
        politicalSalience: 0.7,
        liquidityShockProb: 0.08,
        sybilScale: 2.5,
      },
      availableOracleTypes: [
        'government_id_oracle',
        'aadhaar_oracle',
        'field_attestation',
      ],
      paymentRails: ['bank_transfer', 'upi', 'post_office'],
      agentBehaviorModifiers: {
        corrupt_field_agent_risk_tolerance: 0.7,
        eligible_beneficiary_literacy: 0.3,
        shell_merchant_prevalence: 0.4,
        political_interference: 0.8,
      },
      defaultCurrency: 'INR',
    },
  ],
  [
    'kenya_nairobi',
    {
      country: 'Kenya',
      region: 'Nairobi',
      description:
        'Nairobi urban — mobile money prevalent, moderate corruption, strong mobile oracle infrastructure. M-Pesa ecosystem enables rapid disbursement but also faster leakage.',
      parameterOverrides: {
        corruptionRate: { alpha: 3, beta: 5 },
        oracleFailureProb: 0.08,
        coalitionSuccessProb: 0.4,
        merchantCoverage: { alpha: 5, beta: 3 },
        adversaryDensity: 2,
        politicalSalience: 0.5,
        liquidityShockProb: 0.06,
        sybilScale: 2.0,
      },
      availableOracleTypes: [
        'mobile_money_oracle',
        'government_id_oracle',
        'biometric_oracle',
      ],
      paymentRails: ['mpesa', 'bank_transfer', 'airtel_money'],
      agentBehaviorModifiers: {
        corrupt_field_agent_risk_tolerance: 0.5,
        eligible_beneficiary_literacy: 0.6,
        shell_merchant_prevalence: 0.25,
        political_interference: 0.5,
      },
      defaultCurrency: 'KES',
    },
  ],
  [
    'brazil_northeast',
    {
      country: 'Brazil',
      region: 'Northeast',
      description:
        'Brazilian Northeast — Bolsa Familia context, established transfer infrastructure but political manipulation risk. Strong regulatory framework but enforcement gaps.',
      parameterOverrides: {
        corruptionRate: { alpha: 3, beta: 6 },
        oracleFailureProb: 0.05,
        coalitionSuccessProb: 0.35,
        merchantCoverage: { alpha: 6, beta: 3 },
        adversaryDensity: 1.5,
        politicalSalience: 0.8,
        liquidityShockProb: 0.04,
        sybilScale: 1.8,
      },
      availableOracleTypes: [
        'government_id_oracle',
        'cadastro_unico_oracle',
        'bank_oracle',
      ],
      paymentRails: ['pix', 'bank_transfer', 'caixa_loteria'],
      agentBehaviorModifiers: {
        corrupt_field_agent_risk_tolerance: 0.4,
        eligible_beneficiary_literacy: 0.5,
        shell_merchant_prevalence: 0.2,
        political_interference: 0.7,
      },
      defaultCurrency: 'BRL',
    },
  ],
  [
    'nigeria_lagos',
    {
      country: 'Nigeria',
      region: 'Lagos',
      description:
        'Lagos urban — high adversary density, sophisticated fraud networks, weak oracle infrastructure. Fast-growing fintech ecosystem creates both opportunities and risks.',
      parameterOverrides: {
        corruptionRate: { alpha: 2, beta: 2.5 },
        oracleFailureProb: 0.12,
        coalitionSuccessProb: 0.55,
        merchantCoverage: { alpha: 3, beta: 4 },
        adversaryDensity: 4,
        politicalSalience: 0.6,
        liquidityShockProb: 0.1,
        sybilScale: 3.0,
      },
      availableOracleTypes: [
        'bvn_oracle',
        'nin_oracle',
        'mobile_money_oracle',
      ],
      paymentRails: ['bank_transfer', 'ussd', 'opay', 'palmpay'],
      agentBehaviorModifiers: {
        corrupt_field_agent_risk_tolerance: 0.65,
        eligible_beneficiary_literacy: 0.5,
        shell_merchant_prevalence: 0.45,
        political_interference: 0.55,
      },
      defaultCurrency: 'NGN',
    },
  ],
  [
    'usa_midwest',
    {
      country: 'USA',
      region: 'Midwest',
      description:
        'US Midwest — low corruption baseline, strong regulatory framework, digital infrastructure. Corporate voucher or B2B trade finance context.',
      parameterOverrides: {
        corruptionRate: { alpha: 8, beta: 2 },
        oracleFailureProb: 0.02,
        coalitionSuccessProb: 0.2,
        merchantCoverage: { alpha: 8, beta: 2 },
        adversaryDensity: 1,
        politicalSalience: 0.3,
        liquidityShockProb: 0.02,
        sybilScale: 1.5,
      },
      availableOracleTypes: [
        'api_usage_oracle',
        'bank_oracle',
        'identity_oracle',
      ],
      paymentRails: ['ach', 'wire', 'card_network'],
      agentBehaviorModifiers: {
        corrupt_field_agent_risk_tolerance: 0.2,
        eligible_beneficiary_literacy: 0.9,
        shell_merchant_prevalence: 0.1,
        political_interference: 0.2,
      },
      defaultCurrency: 'USD',
    },
  ],
  [
    'indonesia_java',
    {
      country: 'Indonesia',
      region: 'Java',
      description:
        'Java — large population, mixed digital adoption, moderate corruption. Government subsidy programs with significant scale challenges.',
      parameterOverrides: {
        corruptionRate: { alpha: 3, beta: 4 },
        oracleFailureProb: 0.1,
        coalitionSuccessProb: 0.45,
        merchantCoverage: { alpha: 4, beta: 4 },
        adversaryDensity: 2.5,
        politicalSalience: 0.6,
        liquidityShockProb: 0.07,
        sybilScale: 2.2,
      },
      availableOracleTypes: [
        'government_id_oracle',
        'nik_oracle',
        'bank_oracle',
      ],
      paymentRails: ['bank_transfer', 'gopay', 'ovo', 'dana'],
      agentBehaviorModifiers: {
        corrupt_field_agent_risk_tolerance: 0.5,
        eligible_beneficiary_literacy: 0.55,
        shell_merchant_prevalence: 0.3,
        political_interference: 0.6,
      },
      defaultCurrency: 'IDR',
    },
  ],
]);

/**
 * Get the country context by key (lowercase country_region format).
 */
export function getCountryContext(key: string): CountryContext | undefined {
  return COUNTRY_CATALOG.get(key);
}

/**
 * Resolve a country context from country + region strings.
 * Falls back to a generic default if not found.
 */
export function resolveCountryContext(
  country: string,
  region: string
): CountryContext {
  // Try exact match
  const key = `${country.toLowerCase()}_${region.toLowerCase().replace(/[^a-z]/g, '')}`;
  const exact = COUNTRY_CATALOG.get(key);
  if (exact) return exact;

  // Try country-only match
  for (const [k, ctx] of COUNTRY_CATALOG.entries()) {
    if (k.startsWith(country.toLowerCase())) {
      return ctx;
    }
  }

  // Generic default
  return {
    country,
    region,
    description: `Generic context for ${country} - ${region}`,
    parameterOverrides: {
      corruptionRate: { alpha: 3, beta: 5 },
      oracleFailureProb: 0.1,
      coalitionSuccessProb: 0.4,
      merchantCoverage: { alpha: 4, beta: 4 },
      adversaryDensity: 2,
      politicalSalience: 0.5,
      liquidityShockProb: 0.05,
      sybilScale: 2.0,
    },
    availableOracleTypes: ['government_id_oracle', 'api_usage_oracle'],
    paymentRails: ['bank_transfer'],
    agentBehaviorModifiers: {
      corrupt_field_agent_risk_tolerance: 0.5,
      eligible_beneficiary_literacy: 0.5,
      shell_merchant_prevalence: 0.25,
      political_interference: 0.5,
    },
    defaultCurrency: 'USD',
  };
}
