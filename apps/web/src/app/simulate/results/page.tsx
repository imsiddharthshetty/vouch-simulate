'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { QuickScanResult, FailureMode, Recommendation } from '@vouch/simulate-engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskColor(score: number): string {
  if (score < 4) return 'text-green-600';
  if (score < 7) return 'text-amber-500';
  return 'text-red-600';
}

function riskBg(score: number): string {
  if (score < 4) return 'bg-green-500';
  if (score < 7) return 'bg-amber-500';
  return 'bg-red-500';
}

function riskRingColor(score: number): string {
  if (score < 4) return 'ring-green-200 border-green-400';
  if (score < 7) return 'ring-amber-200 border-amber-400';
  return 'ring-red-200 border-red-400';
}

function severityBadge(severity: string) {
  const map: Record<string, string> = {
    low: 'bg-blue-100 text-blue-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };
  return map[severity] ?? 'bg-gray-100 text-gray-700';
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function formatAssetType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<QuickScanResult | null>(null);
  const [expandedFailure, setExpandedFailure] = useState<number | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('vouch_sim_result');
    if (!raw) {
      router.replace('/simulate/configure');
      return;
    }
    try {
      setResult(JSON.parse(raw) as QuickScanResult);
    } catch {
      router.replace('/simulate/configure');
    }
  }, [router]);

  if (!result) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading results...</div>
      </div>
    );
  }

  const { config, run } = result;
  const { metrics } = run;

  // Build executive summary template
  const summary = buildSummary(result);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ===== A. Header ===== */}
      <section className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          {/* Risk score circle */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <div
              className={`w-28 h-28 rounded-full border-4 ring-4 flex flex-col items-center justify-center ${riskRingColor(
                metrics.riskScore
              )}`}
            >
              <span className={`text-3xl font-bold ${riskColor(metrics.riskScore)}`}>
                {metrics.riskScore.toFixed(1)}
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                Risk Score
              </span>
            </div>
          </div>

          {/* Program info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {config.programName}
            </h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-medium">
                {formatAssetType(config.assetType)}
              </span>
              <span className="rounded-full bg-gray-100 text-gray-700 px-2.5 py-0.5 text-xs font-medium">
                {config.country}, {config.region}
              </span>
              <span className="rounded-full bg-gray-100 text-gray-700 px-2.5 py-0.5 text-xs font-medium">
                {config.populationSize.toLocaleString()} agents
              </span>
              <span className="rounded-full bg-gray-100 text-gray-700 px-2.5 py-0.5 text-xs font-medium">
                {config.currency} {config.totalCap.toLocaleString()} cap
              </span>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-3 gap-4 mt-5">
              <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                <div className="text-lg font-bold text-gray-900">
                  {pct(metrics.redemptionRate)}
                </div>
                <div className="text-xs text-gray-500">Redemption Rate</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                <div className="text-lg font-bold text-gray-900">
                  {pct(metrics.leakageRate)}
                </div>
                <div className="text-xs text-gray-500">Leakage Rate</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                <div className={`text-lg font-bold ${riskColor(metrics.riskScore)}`}>
                  {metrics.riskScore.toFixed(1)}/10
                </div>
                <div className="text-xs text-gray-500">Risk Score</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== B. Metric Cards ===== */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Key Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Redemption Rate */}
          <MetricCard
            name="Redemption Rate"
            value={pct(metrics.redemptionRate)}
            color={
              metrics.redemptionRate > 0.7
                ? 'green'
                : metrics.redemptionRate > 0.5
                ? 'amber'
                : 'red'
            }
            interpretation={
              metrics.redemptionRate > 0.7
                ? 'Healthy redemption levels'
                : metrics.redemptionRate > 0.5
                ? 'Below target — investigate barriers'
                : 'Critical — most funds unredeemed'
            }
          />
          {/* Leakage Rate */}
          <MetricCard
            name="Leakage Rate"
            value={pct(metrics.leakageRate)}
            color={
              metrics.leakageRate < 0.1
                ? 'green'
                : metrics.leakageRate < 0.2
                ? 'amber'
                : 'red'
            }
            interpretation={
              metrics.leakageRate < 0.1
                ? 'Leakage within acceptable bounds'
                : metrics.leakageRate < 0.2
                ? 'Elevated leakage — monitor closely'
                : 'Severe leakage — immediate action needed'
            }
          />
          {/* Catastrophic Failure */}
          <MetricCard
            name="Catastrophic Failure"
            value={metrics.catastrophicFailure ? 'YES' : 'NO'}
            color={metrics.catastrophicFailure ? 'red' : 'green'}
            interpretation={
              metrics.catastrophicFailure
                ? 'Threshold breached — program at risk'
                : 'No catastrophic threshold breach'
            }
          />
          {/* Collusion Success */}
          <MetricCard
            name="Collusion Detected"
            value={metrics.collusionSucceeded ? 'YES' : 'NO'}
            color={metrics.collusionSucceeded ? 'red' : 'green'}
            interpretation={
              metrics.collusionSucceeded
                ? 'Undetected coalitions active'
                : 'No undetected collusion networks'
            }
          />
        </div>
      </section>

      {/* ===== C. Failure Modes ===== */}
      {result.failureModes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Identified Failure Modes
          </h2>
          <div className="space-y-3">
            {result.failureModes.map((fm, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedFailure(expandedFailure === i ? null : i)
                  }
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${severityBadge(
                      fm.severity
                    )}`}
                  >
                    {fm.severity.toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 flex-1">
                    {fm.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    T{fm.timeStep}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      expandedFailure === i ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>
                {expandedFailure === i && (
                  <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Description
                        </div>
                        <p className="text-sm text-gray-700">
                          {fm.description}
                        </p>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Causal Pathway
                        </div>
                        <p className="text-sm text-gray-700">
                          {fm.causalPathway}
                        </p>
                      </div>
                    </div>
                    {fm.involvedAgents.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                          Involved Agents
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {fm.involvedAgents.map((a) => (
                            <span
                              key={a}
                              className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-mono"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== D. Recommendations ===== */}
      {result.recommendations.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recommendations
          </h2>
          <div className="space-y-3">
            {result.recommendations.map((rec, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {rec.title}
                      </h3>
                      <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-medium">
                        {rec.targetFailureMode}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{rec.description}</p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-0.5">
                          Suggested Change
                        </div>
                        <p className="text-xs text-gray-700 font-mono">
                          {rec.suggestedChange}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="text-[10px] font-medium text-green-600 uppercase tracking-wider mb-0.5">
                          Expected Impact
                        </div>
                        <p className="text-xs text-green-800">
                          {rec.expectedImpact}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/simulate/configure')}
                    className="flex-shrink-0 rounded-lg bg-blue-50 text-blue-600 px-3 py-2 text-xs font-medium hover:bg-blue-100 transition-colors"
                  >
                    Apply &amp; Re-run
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== E. Executive Summary ===== */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Executive Summary
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
            {summary}
          </div>
        </div>
      </section>

      {/* ===== F. Actions Bar ===== */}
      <section className="sticky bottom-0 bg-gradient-to-t from-gray-50 via-gray-50 to-gray-50/0 pt-6 pb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push('/simulate/configure')}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
              />
            </svg>
            Re-run with Changes
          </button>
          <button
            disabled
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-400 font-semibold rounded-xl cursor-not-allowed relative group"
            title="Coming in Phase 2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            Export PDF
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1 whitespace-nowrap">
              Coming in Phase 2
            </span>
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('vouch_sim_config');
              localStorage.removeItem('vouch_sim_result');
              router.push('/simulate/configure');
            }}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            New Simulation
          </button>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricCard component
// ---------------------------------------------------------------------------

function MetricCard({
  name,
  value,
  color,
  interpretation,
}: {
  name: string;
  value: string;
  color: 'green' | 'amber' | 'red';
  interpretation: string;
}) {
  const colorMap = {
    green: {
      indicator: 'bg-green-500',
      valueCls: 'text-green-600',
      bgCls: 'bg-green-50',
    },
    amber: {
      indicator: 'bg-amber-500',
      valueCls: 'text-amber-600',
      bgCls: 'bg-amber-50',
    },
    red: {
      indicator: 'bg-red-500',
      valueCls: 'text-red-600',
      bgCls: 'bg-red-50',
    },
  };
  const c = colorMap[color];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${c.indicator}`} />
        <span className="text-sm font-medium text-gray-600">{name}</span>
      </div>
      <div className={`text-2xl font-bold mb-2 ${c.valueCls}`}>{value}</div>
      <p className="text-xs text-gray-500">{interpretation}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary builder
// ---------------------------------------------------------------------------

function buildSummary(result: QuickScanResult): string {
  const { config, run } = result;
  const m = run.metrics;

  const riskLevel =
    m.riskScore < 4 ? 'LOW' : m.riskScore < 7 ? 'MODERATE' : 'HIGH';

  const failureCount = result.failureModes.length;
  const criticalCount = result.failureModes.filter(
    (f) => f.severity === 'critical'
  ).length;
  const highCount = result.failureModes.filter(
    (f) => f.severity === 'high'
  ).length;

  let lines = [
    `SIMULATION REPORT: ${config.programName}`,
    `${'='.repeat(50)}`,
    ``,
    `Program: ${config.programName}`,
    `Asset Type: ${formatAssetType(config.assetType)}`,
    `Region: ${config.country}, ${config.region}`,
    `Population: ${config.populationSize.toLocaleString()} agents`,
    `Program Cap: ${config.currency} ${config.totalCap.toLocaleString()}`,
    ``,
    `OVERALL RISK: ${riskLevel} (${m.riskScore.toFixed(1)}/10)`,
    ``,
    `The Quick Scan simulation ran ${config.timeSteps} time steps with ${config.populationSize.toLocaleString()} agents across ${
      new Set(run.finalState.agents.map((a) => a.faction)).size
    } factions. The simulation tested ${config.stressScenarios.length} stress scenarios including ${config.stressScenarios.join(', ').replace(/_/g, ' ')}.`,
    ``,
    `Key findings:`,
    `- Redemption rate: ${(m.redemptionRate * 100).toFixed(1)}% of program funds were successfully redeemed by legitimate beneficiaries.`,
    `- Leakage rate: ${(m.leakageRate * 100).toFixed(1)}% of funds were lost to fraud, sybil attacks, or system exploitation.`,
    `- Slashed funds: ${config.currency} ${m.totalSlashed.toFixed(0)} were recovered through slashing mechanisms.`,
  ];

  if (m.catastrophicFailure) {
    lines.push(
      `- CATASTROPHIC FAILURE: The ${config.catastrophicFailureThreshold.metric.replace(
        /_/g,
        ' '
      )} exceeded the configured threshold of ${config.catastrophicFailureThreshold.value}. This program design requires significant revision before deployment.`
    );
  }

  if (m.collusionSucceeded) {
    lines.push(
      `- COLLUSION DETECTED: Undetected coalition networks operated successfully during the simulation. Anti-collusion mechanisms need strengthening.`
    );
  }

  if (failureCount > 0) {
    lines.push(``);
    lines.push(
      `The simulation identified ${failureCount} failure mode${failureCount > 1 ? 's' : ''}: ${criticalCount} critical, ${highCount} high severity. ${result.recommendations.length} actionable recommendations have been generated.`
    );
  } else {
    lines.push(``);
    lines.push(
      `No significant failure modes were identified. The program design appears resilient under the tested stress scenarios.`
    );
  }

  lines.push(``);
  lines.push(
    `This analysis is based on a single Quick Scan run. For higher confidence, consider running a Full Monte Carlo simulation (Phase 2) with 100+ parameter samples.`
  );

  return lines.join('\n');
}
