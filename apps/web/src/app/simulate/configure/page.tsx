'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type {
  AssetType,
  ProgramType,
  StressScenario,
  SimulationConfig,
} from '@vouch/simulate-engine';

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const ASSET_OPTIONS: {
  type: AssetType;
  emoji: string;
  name: string;
  description: string;
}[] = [
  {
    type: 'fiat_voucher',
    emoji: '\u{1F4B5}',
    name: 'Fiat Voucher',
    description: 'Currency-denominated vouchers for goods and services',
  },
  {
    type: 'cloud_compute',
    emoji: '\u{2601}\uFE0F',
    name: 'Cloud Compute',
    description: 'CPU/GPU credits and storage allocations',
  },
  {
    type: 'equity_tokens',
    emoji: '\u{1F4C8}',
    name: 'Equity Tokens',
    description: 'Tokenized equity or profit-sharing instruments',
  },
  {
    type: 'carbon_credits',
    emoji: '\u{1F33F}',
    name: 'Carbon Credits',
    description: 'Verified carbon offset credits',
  },
  {
    type: 'data_access',
    emoji: '\u{1F512}',
    name: 'Data Access',
    description: 'Tokens granting API or dataset access',
  },
  {
    type: 'physical_goods',
    emoji: '\u{1F4E6}',
    name: 'Physical Goods',
    description: 'Vouchers for food, medicine, or materials',
  },
  {
    type: 'custom',
    emoji: '\u{2699}\uFE0F',
    name: 'Custom',
    description: 'User-defined asset type',
  },
];

const PROGRAM_OPTIONS: {
  type: ProgramType;
  emoji: string;
  name: string;
  description: string;
}[] = [
  {
    type: 'govt_subsidy',
    emoji: '\u{1F3DB}\uFE0F',
    name: 'Government Subsidy',
    description: 'State-run distribution programs',
  },
  {
    type: 'corporate_voucher',
    emoji: '\u{1F3E2}',
    name: 'Corporate Voucher',
    description: 'Employee benefits and rewards',
  },
  {
    type: 'ngo_aid',
    emoji: '\u{1F91D}',
    name: 'NGO Aid',
    description: 'Humanitarian aid distribution',
  },
  {
    type: 'b2b_trade_finance',
    emoji: '\u{1F4B1}',
    name: 'B2B Trade Finance',
    description: 'Invoice factoring and supply chain finance',
  },
  {
    type: 'agentic_commerce',
    emoji: '\u{1F916}',
    name: 'Agentic Commerce',
    description: 'AI-agent-driven autonomous transactions',
  },
];

const COUNTRY_REGIONS: Record<string, string[]> = {
  India: ['Bihar', 'Maharashtra', 'Tamil Nadu', 'Karnataka', 'Rajasthan'],
  Kenya: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'],
  Brazil: ['Northeast', 'Southeast', 'South', 'North'],
  Nigeria: ['Lagos', 'Abuja', 'Kano', 'Rivers'],
  USA: ['Midwest', 'Northeast', 'South', 'West'],
  Indonesia: ['Java', 'Sumatra', 'Bali', 'Kalimantan'],
};

const CURRENCIES: Record<string, string> = {
  India: 'INR',
  Kenya: 'KES',
  Brazil: 'BRL',
  Nigeria: 'NGN',
  USA: 'USD',
  Indonesia: 'IDR',
};

const ORACLE_OPTIONS: Record<AssetType, string[]> = {
  fiat_voucher: [
    'Bank settlement (UPI)',
    'Government ID oracle',
    'Aadhaar oracle',
    'Field attestation',
  ],
  cloud_compute: ['API usage oracle', 'Cloud provider oracle'],
  equity_tokens: ['Market price oracle', 'KYC oracle'],
  carbon_credits: ['Environmental oracle', 'Registry oracle'],
  data_access: ['API usage oracle', 'Access log oracle'],
  physical_goods: ['Supply chain oracle', 'Delivery oracle'],
  custom: ['Custom oracle'],
};

const STRESS_SCENARIOS: { key: StressScenario; label: string; description: string }[] = [
  {
    key: 'oracle_failure',
    label: 'Oracle Failure',
    description: 'Verification system goes down',
  },
  {
    key: 'collusion_attack',
    label: 'Collusion Attack',
    description: 'Agents form fraud coalitions',
  },
  {
    key: 'liquidity_crunch',
    label: 'Liquidity Crunch',
    description: 'External liquidity shock event',
  },
  {
    key: 'cold_start',
    label: 'Cold Start',
    description: 'Low merchant coverage at launch',
  },
  {
    key: 'political_weaponization',
    label: 'Political Weaponization',
    description: 'Program becomes political target',
  },
  {
    key: 'competitor_sabotage',
    label: 'Competitor Sabotage',
    description: 'Rival programs undermine operations',
  },
  {
    key: 'sybil_attack',
    label: 'Sybil Attack',
    description: 'Synthetic identities drain funds',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConfigurePage() {
  const router = useRouter();

  // --- Context ---
  const [assetType, setAssetType] = useState<AssetType>('fiat_voucher');
  const [country, setCountry] = useState('India');
  const [region, setRegion] = useState('Bihar');
  const [programType, setProgramType] = useState<ProgramType>('govt_subsidy');

  // --- Parameters ---
  const [programName, setProgramName] = useState(
    'Bihar Agricultural Input Subsidy'
  );
  const [totalCap, setTotalCap] = useState(10_000_000);
  const [currency, setCurrency] = useState('INR');
  const [perBeneficiaryLimit, setPerBeneficiaryLimit] = useState(5_000);
  const [conditionLogic, setConditionLogic] = useState('');
  const [oracleType, setOracleType] = useState('Bank settlement (UPI)');
  const [redemptionWindowDays, setRedemptionWindowDays] = useState(90);
  const [slashingConditions, setSlashingConditions] = useState(
    'duplicate_claim_detected\nidentity_mismatch\nexpired_voucher\nmerchant_not_registered'
  );
  const [catastrophicMetric, setCatastrophicMetric] = useState<
    'leakage_rate' | 'redemption_rate'
  >('leakage_rate');
  const [catastrophicOperator, setCatastrophicOperator] = useState<'gt' | 'lt'>(
    'gt'
  );
  const [catastrophicValue, setCatastrophicValue] = useState(0.25);

  // --- Simulation settings ---
  const [stressScenarios, setStressScenarios] = useState<StressScenario[]>([
    'oracle_failure',
    'collusion_attack',
    'political_weaponization',
  ]);
  const [populationSize, setPopulationSize] = useState(1000);
  const [adversaryIntensity, setAdversaryIntensity] = useState<
    'low' | 'medium' | 'high'
  >('medium');

  // --- Handlers ---

  const handleCountryChange = useCallback(
    (c: string) => {
      setCountry(c);
      const regions = COUNTRY_REGIONS[c];
      setRegion(regions?.[0] ?? '');
      setCurrency(CURRENCIES[c] ?? 'USD');
    },
    []
  );

  const handleAssetTypeChange = useCallback(
    (t: AssetType) => {
      setAssetType(t);
      const oracles = ORACLE_OPTIONS[t];
      setOracleType(oracles?.[0] ?? '');
    },
    []
  );

  const toggleStress = useCallback(
    (s: StressScenario) => {
      setStressScenarios((prev) =>
        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
      );
    },
    []
  );

  const handleRun = useCallback(() => {
    const config: SimulationConfig = {
      programName,
      assetType,
      country,
      region,
      programType,
      totalCap,
      currency,
      perBeneficiaryLimit,
      conditionLogic: { gte: ['beneficiary_eligible', 1] } as SimulationConfig['conditionLogic'],
      oracleType,
      redemptionWindowDays,
      slashingConditions: slashingConditions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      disputeResolution: 'manual_review',
      catastrophicFailureThreshold: {
        metric: catastrophicMetric,
        operator: catastrophicOperator,
        value: catastrophicValue,
      },
      stressScenarios,
      populationSize,
      adversaryIntensity,
      timeSteps: 5,
    };

    localStorage.setItem('vouch_sim_config', JSON.stringify(config));
    router.push('/simulate/running');
  }, [
    programName,
    assetType,
    country,
    region,
    programType,
    totalCap,
    currency,
    perBeneficiaryLimit,
    conditionLogic,
    oracleType,
    redemptionWindowDays,
    slashingConditions,
    catastrophicMetric,
    catastrophicOperator,
    catastrophicValue,
    stressScenarios,
    populationSize,
    adversaryIntensity,
    router,
  ]);

  // --- Render ---

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Configure Simulation
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Set up your value transfer program parameters and stress-test
          scenarios.
        </p>
      </div>

      {/* ===== A. Context ===== */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Asset Type
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ASSET_OPTIONS.map((a) => (
            <button
              key={a.type}
              onClick={() => handleAssetTypeChange(a.type)}
              className={`bg-white rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                assetType === a.type
                  ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                  : 'border-gray-200'
              }`}
            >
              <div className="text-2xl mb-2">{a.emoji}</div>
              <div className="text-sm font-semibold text-gray-900">
                {a.name}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {a.description}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Country + Region */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Country &amp; Region
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Country
            </label>
            <select
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            >
              {Object.keys(COUNTRY_REGIONS).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            >
              {(COUNTRY_REGIONS[country] ?? []).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Program type */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Program Type
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PROGRAM_OPTIONS.map((p) => (
            <button
              key={p.type}
              onClick={() => setProgramType(p.type)}
              className={`bg-white rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                programType === p.type
                  ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                  : 'border-gray-200'
              }`}
            >
              <div className="text-2xl mb-2">{p.emoji}</div>
              <div className="text-sm font-semibold text-gray-900">
                {p.name}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {p.description}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ===== B. Program Parameters ===== */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Program Parameters
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          {/* Program name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Program Name
            </label>
            <input
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
              placeholder="e.g., Bihar Agricultural Input Subsidy"
            />
          </div>

          {/* Total cap + currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Total Program Cap
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={totalCap}
                  onChange={(e) => setTotalCap(Number(e.target.value))}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  min={1}
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-24 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                >
                  {['USD', 'INR', 'KES', 'BRL', 'NGN', 'IDR'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Per-Beneficiary Limit
              </label>
              <input
                type="number"
                value={perBeneficiaryLimit}
                onChange={(e) =>
                  setPerBeneficiaryLimit(Number(e.target.value))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                min={1}
              />
            </div>
          </div>

          {/* Condition logic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Condition Logic
            </label>
            <textarea
              value={conditionLogic}
              onChange={(e) => setConditionLogic(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition resize-none"
              placeholder="Describe the condition for transfer release..."
            />
            <p className="text-xs text-gray-400 mt-1">
              Full JSON AST builder coming in Phase 2. For now, describe in
              plain text.
            </p>
          </div>

          {/* Oracle + Redemption window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Oracle Type
              </label>
              <select
                value={oracleType}
                onChange={(e) => setOracleType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
              >
                {(ORACLE_OPTIONS[assetType] ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Redemption Window (days)
              </label>
              <input
                type="number"
                value={redemptionWindowDays}
                onChange={(e) =>
                  setRedemptionWindowDays(Number(e.target.value))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                min={1}
              />
            </div>
          </div>

          {/* Slashing conditions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Slashing Conditions
            </label>
            <textarea
              value={slashingConditions}
              onChange={(e) => setSlashingConditions(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition resize-none"
              placeholder="One condition per line"
            />
          </div>

          {/* Catastrophic failure threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Catastrophic Failure Threshold
            </label>
            <div className="flex gap-2 items-center">
              <select
                value={catastrophicMetric}
                onChange={(e) =>
                  setCatastrophicMetric(
                    e.target.value as 'leakage_rate' | 'redemption_rate'
                  )
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
              >
                <option value="leakage_rate">Leakage Rate</option>
                <option value="redemption_rate">Redemption Rate</option>
              </select>
              <select
                value={catastrophicOperator}
                onChange={(e) =>
                  setCatastrophicOperator(e.target.value as 'gt' | 'lt')
                }
                className="w-16 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition text-center"
              >
                <option value="gt">&gt;</option>
                <option value="lt">&lt;</option>
              </select>
              <input
                type="number"
                value={catastrophicValue}
                onChange={(e) =>
                  setCatastrophicValue(Number(e.target.value))
                }
                step={0.01}
                min={0}
                max={1}
                className="w-24 rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== C. Simulation Settings ===== */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Simulation Settings
        </h2>

        {/* Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mode
          </label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button className="bg-white rounded-xl border-2 border-blue-500 ring-2 ring-blue-100 p-4 text-left shadow-sm">
              <div className="text-sm font-semibold text-blue-700">
                Quick Scan
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Single run, 5 time steps
              </div>
            </button>
            <button
              disabled
              className="bg-gray-50 rounded-xl border-2 border-gray-200 p-4 text-left opacity-60 cursor-not-allowed relative"
            >
              <span className="absolute top-2 right-2 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                Coming Soon
              </span>
              <div className="text-sm font-semibold text-gray-400">
                Full Simulation
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                Monte Carlo, 100+ runs
              </div>
            </button>
          </div>
        </div>

        {/* Stress scenarios */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stress Scenarios
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STRESS_SCENARIOS.map((s) => {
              const checked = stressScenarios.includes(s.key);
              return (
                <label
                  key={s.key}
                  className={`flex items-start gap-3 bg-white rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm ${
                    checked
                      ? 'border-blue-300 bg-blue-50/50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleStress(s.key)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {s.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {s.description}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Population + adversary intensity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Population Size
            </label>
            <select
              value={populationSize}
              onChange={(e) => setPopulationSize(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            >
              {[10, 100, 1000, 10000].map((n) => (
                <option key={n} value={n}>
                  {n.toLocaleString()} agents
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adversary Intensity
            </label>
            <div className="flex gap-2">
              {(
                [
                  { key: 'low', label: 'Low', color: 'green' },
                  { key: 'medium', label: 'Medium', color: 'amber' },
                  { key: 'high', label: 'High', color: 'red' },
                ] as const
              ).map((level) => (
                <button
                  key={level.key}
                  onClick={() => setAdversaryIntensity(level.key)}
                  className={`flex-1 rounded-lg border-2 py-2.5 text-sm font-medium transition-all ${
                    adversaryIntensity === level.key
                      ? level.color === 'green'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : level.color === 'amber'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== D. Run button ===== */}
      <div className="sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-gray-50/0 pt-6 pb-8">
        <button
          onClick={handleRun}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25 text-base"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
            />
          </svg>
          Run Quick Scan
        </button>
      </div>
    </div>
  );
}
