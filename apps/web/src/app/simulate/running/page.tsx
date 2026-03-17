'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type {
  SimulationConfig,
  QuickScanResult,
  EventEntry,
  AgentState,
  LLMAdapter,
  AgentDecisionContext,
  RunResult,
} from '@vouch/simulate-engine';
import {
  runQuickScan,
  AGENT_REGISTRY,
  getAgentsForContext,
  heuristicFallback,
} from '@vouch/simulate-engine';

// ---------------------------------------------------------------------------
// Faction color mapping
// ---------------------------------------------------------------------------

const FACTION_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  beneficiaries: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  field_ops: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  merchants: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  political_media: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  oracles: { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  financial_rails: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  competitors: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  ai_adversarial: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

function factionBadge(faction: string) {
  const c = FACTION_COLORS[faction] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };
  return `${c.bg} ${c.text}`;
}

function formatAgentType(type: string) {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Event type styling
// ---------------------------------------------------------------------------

function eventTypeStyle(type: string): { color: string; icon: string } {
  switch (type) {
    case 'agent_action':
      return { color: 'text-blue-600', icon: '\u{25B6}' };
    case 'agent_action_rejected':
      return { color: 'text-amber-600', icon: '\u{26A0}' };
    case 'oracle_failure':
      return { color: 'text-red-600', icon: '\u{1F6A8}' };
    case 'liquidity_shock':
      return { color: 'text-red-600', icon: '\u{1F4C9}' };
    case 'media_publication':
      return { color: 'text-purple-600', icon: '\u{1F4F0}' };
    case 'political_intervention':
      return { color: 'text-purple-600', icon: '\u{1F3DB}' };
    case 'coalition_formed':
      return { color: 'text-orange-600', icon: '\u{1F91D}' };
    case 'coalition_detected':
      return { color: 'text-green-600', icon: '\u{1F50D}' };
    case 'catastrophic_failure':
      return { color: 'text-red-700', icon: '\u{1F4A5}' };
    case 'system_update':
      return { color: 'text-gray-500', icon: '\u{2699}' };
    default:
      return { color: 'text-gray-500', icon: '\u{2022}' };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RunningPage() {
  const router = useRouter();
  const [config, setConfig] = useState<SimulationConfig | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [agents, setAgents] = useState<
    { type: string; faction: string; count: number }[]
  >([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  // Load config from localStorage
  useEffect(() => {
    const raw = localStorage.getItem('vouch_sim_config');
    if (!raw) {
      router.replace('/simulate/configure');
      return;
    }
    try {
      setConfig(JSON.parse(raw) as SimulationConfig);
    } catch {
      router.replace('/simulate/configure');
    }
  }, [router]);

  // Compute agent roster when config is ready
  useEffect(() => {
    if (!config) return;
    const agentDefs = getAgentsForContext(
      config.programType,
      config.adversaryIntensity
    );
    // Group and count
    const map = new Map<string, { type: string; faction: string; count: number }>();
    for (const def of agentDefs) {
      const key = def.type;
      if (!map.has(key)) {
        map.set(key, { type: def.type, faction: def.faction, count: 0 });
      }
    }
    // Rough population allocation
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
    for (const def of agentDefs) {
      const entry = map.get(def.type)!;
      const factionPop = Math.max(
        1,
        Math.round(config.populationSize * (factionRatios[def.faction] ?? 0.05))
      );
      // Split evenly among types in same faction
      const sameF = agentDefs.filter((d) => d.faction === def.faction).length;
      entry.count = Math.max(1, Math.round(factionPop / sameF));
    }
    setAgents(Array.from(map.values()));
  }, [config]);

  // Run the simulation
  useEffect(() => {
    if (!config || hasStarted.current) return;
    hasStarted.current = true;

    const totalSteps = config.timeSteps || 5;
    let cancelled = false;

    const mockAdapter: LLMAdapter = {
      async resolveAgentDecision(ctx: AgentDecisionContext) {
        return heuristicFallback(ctx);
      },
      async generateNarrative() {
        return 'Simulation completed. Analysis pending.';
      },
      async generateSummary() {
        return 'Executive summary will be generated based on results.';
      },
    };

    (async () => {
      try {
        // We run the full simulation via runQuickScan, but animate step reveals
        const result = await runQuickScan(config, mockAdapter);

        if (cancelled) return;

        const allEvents = result.run.finalState.eventLog;

        // Reveal events step by step with delay
        for (let step = 1; step <= totalSteps; step++) {
          if (cancelled) return;
          setCurrentStep(step);

          const stepEvents = allEvents.filter((e) => e.timeStep === step);
          // Add events one batch at a time
          setEvents((prev) => [...prev, ...stepEvents]);

          // Wait before next step
          await new Promise((r) => setTimeout(r, 600));
        }

        // Also show any step=0 events at the start
        const zeroEvents = allEvents.filter((e) => e.timeStep === 0);
        if (zeroEvents.length > 0) {
          setEvents((prev) => [...zeroEvents, ...prev]);
        }

        // Store result
        localStorage.setItem('vouch_sim_result', JSON.stringify(result));
        setDone(true);

        // Navigate after short delay
        await new Promise((r) => setTimeout(r, 800));
        if (!cancelled) {
          router.push('/simulate/results');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config, router]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  if (!config) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading configuration...</div>
      </div>
    );
  }

  const totalSteps = config.timeSteps || 5;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Running Quick Scan
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {config.programName} &mdash; {config.country}, {config.region}
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700 font-medium">Simulation Error</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
          <button
            onClick={() => router.push('/simulate/configure')}
            className="mt-3 text-sm text-red-700 underline hover:no-underline"
          >
            Back to Configure
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: agent roster */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Agent Roster
            </h2>
            <div className="space-y-2">
              {agents.map((a) => {
                const colors = FACTION_COLORS[a.faction] ?? {
                  bg: 'bg-gray-100',
                  text: 'text-gray-700',
                  dot: 'bg-gray-500',
                };
                return (
                  <div
                    key={a.type}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`}
                    />
                    <span className="text-gray-700 flex-1 truncate">
                      {formatAgentType(a.type)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                    >
                      {a.count}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
              Total: {agents.reduce((s, a) => s + a.count, 0)} agents
            </div>
          </div>
        </div>

        {/* Main: progress + activity log */}
        <div className="lg:col-span-3 space-y-6">
          {/* Timeline progress */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Time Steps
              </h2>
              <span className="text-xs text-gray-500">
                {done
                  ? 'Complete'
                  : currentStep > 0
                  ? `Step ${currentStep} of ${totalSteps}`
                  : 'Initializing...'}
              </span>
            </div>
            <div className="flex gap-2">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map(
                (step) => {
                  const isComplete = currentStep >= step;
                  const isCurrent = currentStep === step && !done;
                  return (
                    <div
                      key={step}
                      className={`flex-1 h-2.5 rounded-full transition-all duration-500 ${
                        isComplete
                          ? done
                            ? 'bg-green-500'
                            : isCurrent
                            ? 'bg-blue-500 animate-pulse'
                            : 'bg-blue-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  );
                }
              )}
            </div>
            <div className="flex justify-between mt-1.5">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map(
                (step) => (
                  <span key={step} className="text-[10px] text-gray-400">
                    T{step}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Activity log */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">
                  Activity Log
                </h2>
                <span className="text-xs text-gray-400">
                  {events.length} events
                </span>
              </div>
            </div>
            <div
              ref={logRef}
              className="max-h-[500px] overflow-y-auto p-4 space-y-2"
            >
              {events.length === 0 && !error && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Initializing simulation...
                  </div>
                </div>
              )}

              {events.map((event, i) => {
                const style = eventTypeStyle(event.type);
                const agentFaction = event.agentId
                  ? event.agentId.replace(/_\d+$/, '').split('_').length > 2
                    ? agents.find((a) =>
                        event.agentId!.startsWith(a.type)
                      )?.faction
                    : agents.find((a) =>
                        event.agentId!.startsWith(a.type)
                      )?.faction
                  : undefined;

                return (
                  <div
                    key={i}
                    className="flex gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100/80 transition-colors animate-fadeIn"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <span className={`text-sm ${style.color}`}>
                        {style.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600">
                          T{event.timeStep}
                        </span>
                        {event.agentId && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              agentFaction
                                ? factionBadge(agentFaction)
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {event.agentId}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                          {event.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">
                        {event.description}
                      </p>
                      {Object.keys(event.impact).length > 0 && (
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          {Object.entries(event.impact).map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] font-mono bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-500"
                            >
                              {k}: {typeof v === 'number' ? v.toFixed(2) : v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {done && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 text-sm text-green-600 font-medium">
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
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Simulation complete. Loading results...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
