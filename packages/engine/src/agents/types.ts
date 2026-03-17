import { AgentType, Faction, ActionType } from '../core/state';

export interface AgentDefinition {
  type: AgentType;
  faction: Faction;
  description: string;
  utilityFunction: string; // human-readable description
  allowedActions: ActionType[];
  defaultRiskTolerance: number; // 0-1
  contextVariable: string; // what varies by country/region
}
