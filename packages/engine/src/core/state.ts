// Ledger tracks all value flows — conservation law: issued = redeemed + leaked + slashed + unredeemed
export interface LedgerState {
  totalIssued: number;
  totalRedeemed: number;
  totalLeaked: number;
  totalSlashed: number;
  totalUnredeemed: number;
}

// Each agent's runtime state
export interface AgentState {
  id: string;
  type: AgentType;
  faction: Faction;
  utilityAccumulated: number;
  actionsThisRun: AgentAction[];
  coalitions: string[]; // IDs of agents in coalition
  detected: boolean;
  active: boolean;
}

// System-level state
export interface SystemState {
  oracleAvailable: boolean;
  merchantCoverage: number; // 0-1
  paymentRailHealth: number; // 0-1
  regulatoryAttention: number; // 0-1
  mediaCoverage: number; // 0-1
  politicalSalience: number; // 0-1
}

// Full simulation state at a point in time
export interface SimulationState {
  timeStep: number;
  ledger: LedgerState;
  agents: AgentState[];
  system: SystemState;
  eventLog: EventEntry[];
}

// Event log entry
export interface EventEntry {
  timeStep: number;
  type: EventType;
  agentId?: string;
  description: string;
  impact: Record<string, number>;
}

export type EventType =
  | 'agent_action'
  | 'agent_action_rejected'
  | 'oracle_failure'
  | 'liquidity_shock'
  | 'media_publication'
  | 'political_intervention'
  | 'coalition_formed'
  | 'coalition_detected'
  | 'catastrophic_failure'
  | 'system_update';

// Agent action proposed by LLM or heuristic
export interface AgentAction {
  agentId: string;
  type: ActionType;
  target?: string;
  value?: number;
  description: string;
}

export type ActionType =
  | 'legitimate_claim'
  | 'fraudulent_claim'
  | 'false_attestation'
  | 'bribe'
  | 'form_coalition'
  | 'report_anomaly'
  | 'block_report'
  | 'publish_story'
  | 'inflate_price'
  | 'sybil_attack'
  | 'replay_attack'
  | 'delay_settlement'
  | 'lobby_regulator'
  | 'investigate'
  | 'routine_check'
  | 'do_nothing';

// Factions
export type Faction =
  | 'beneficiaries'
  | 'field_ops'
  | 'merchants'
  | 'political_media'
  | 'oracles'
  | 'financial_rails'
  | 'competitors'
  | 'ai_adversarial';

// Agent types (12 core for Phase 1)
export type AgentType =
  | 'eligible_beneficiary'
  | 'corrupt_field_agent'
  | 'honest_field_agent'
  | 'registered_merchant'
  | 'shell_merchant'
  | 'ruling_party_politician'
  | 'opposition_politician'
  | 'trusted_oracle'
  | 'compromised_oracle'
  | 'bank_nbfc'
  | 'rival_program_operator'
  | 'sybil_attacker';

// Asset types
export type AssetType =
  | 'fiat_voucher'
  | 'cloud_compute'
  | 'equity_tokens'
  | 'carbon_credits'
  | 'data_access'
  | 'physical_goods'
  | 'custom';

// Program types
export type ProgramType =
  | 'govt_subsidy'
  | 'corporate_voucher'
  | 'ngo_aid'
  | 'b2b_trade_finance'
  | 'agentic_commerce';

// Stress scenarios
export type StressScenario =
  | 'oracle_failure'
  | 'collusion_attack'
  | 'liquidity_crunch'
  | 'cold_start'
  | 'political_weaponization'
  | 'competitor_sabotage'
  | 'sybil_attack';

// Condition rule (JSON AST)
export type ConditionRule =
  | { and: ConditionRule[] }
  | { or: ConditionRule[] }
  | { not: ConditionRule }
  | { gte: [string, number] }
  | { lte: [string, number] }
  | { eq: [string, string | number | boolean] }
  | { gt: [string, number] }
  | { lt: [string, number] };

// Full simulation configuration
export interface SimulationConfig {
  programName: string;
  assetType: AssetType;
  country: string;
  region: string;
  programType: ProgramType;
  totalCap: number;
  currency: string;
  perBeneficiaryLimit: number;
  conditionLogic: ConditionRule;
  oracleType: string;
  redemptionWindowDays: number;
  slashingConditions: string[];
  disputeResolution: string;
  catastrophicFailureThreshold: {
    metric: 'leakage_rate' | 'redemption_rate' | 'risk_score';
    operator: 'gt' | 'lt';
    value: number;
  };
  stressScenarios: StressScenario[];
  populationSize: number;
  adversaryIntensity: 'low' | 'medium' | 'high';
  timeSteps: number;
  seed?: number;
}

// Parameter distributions for Monte Carlo
export interface ParameterDistributions {
  corruptionRate: { alpha: number; beta: number }; // Beta distribution
  oracleFailureProb: number; // Bernoulli p
  coalitionSuccessProb: number;
  merchantCoverage: { alpha: number; beta: number }; // Beta
  adversaryDensity: number; // Poisson lambda
  politicalSalience: number; // Bernoulli p
  liquidityShockProb: number; // Bernoulli p per step
  sybilScale: number; // Pareto alpha
}

// Sampled parameter vector (concrete values for one run)
export interface ParameterVector {
  corruptionRate: number;
  oracleFailureProb: number;
  coalitionSuccessProb: number;
  merchantCoverage: number;
  adversaryDensity: number;
  politicalSalience: boolean;
  liquidityShockProb: number;
  sybilScale: number;
  eventTimings: Record<string, number>; // event name -> time step
}

// Simulation run result
export interface RunResult {
  runNumber: number;
  seed: number;
  parameters: ParameterVector;
  finalState: SimulationState;
  metrics: RunMetrics;
  valid: boolean;
  validationErrors: string[];
}

export interface RunMetrics {
  redemptionRate: number;
  leakageRate: number;
  catastrophicFailure: boolean;
  collusionSucceeded: boolean;
  riskScore: number; // 0-10
  totalRedeemed: number;
  totalLeaked: number;
  totalSlashed: number;
}

// Quick scan output
export interface QuickScanResult {
  config: SimulationConfig;
  run: RunResult;
  narrative?: string;
  executiveSummary?: string;
  failureModes: FailureMode[];
  recommendations: Recommendation[];
}

export interface FailureMode {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  causalPathway: string;
  timeStep: number;
  involvedAgents: string[];
}

export interface Recommendation {
  title: string;
  description: string;
  targetFailureMode: string;
  suggestedChange: string;
  expectedImpact: string;
}
