import {
  AgentState,
  AgentAction,
  SimulationState,
  SimulationConfig,
  ParameterVector,
  EventEntry,
  RunResult,
} from '../core/state';
import { AgentDefinition } from './types';
import { getHeuristicAction } from './heuristics';

/**
 * LLM Adapter interface — injected by caller.
 * Provides AI-driven agent decisions and narrative generation.
 */
export interface LLMAdapter {
  resolveAgentDecision(context: AgentDecisionContext): Promise<AgentAction>;
  generateNarrative(eventLog: EventEntry[]): Promise<string>;
  generateSummary(result: RunResult, config: SimulationConfig): Promise<string>;
}

/**
 * Context provided to the LLM for agent decision-making.
 */
export interface AgentDecisionContext {
  agent: AgentState;
  definition: AgentDefinition;
  state: SimulationState;
  config: SimulationConfig;
  parameters: ParameterVector;
}

/**
 * Resolve a single agent's decision.
 * Tries the LLM adapter first, falls back to heuristic on any failure.
 */
export async function resolveAgentDecision(
  context: AgentDecisionContext,
  adapter: LLMAdapter
): Promise<AgentAction> {
  try {
    return await adapter.resolveAgentDecision(context);
  } catch {
    return heuristicFallback(context);
  }
}

/**
 * Simple utility-maximizing heuristic fallback.
 * Used when the LLM adapter is unavailable or errors.
 */
export function heuristicFallback(context: AgentDecisionContext): AgentAction {
  return getHeuristicAction(
    context.agent,
    context.state,
    context.parameters,
    context.config
  );
}
