import { ConditionRule } from './state';

const MAX_DEPTH = 20;

/**
 * Evaluate a ConditionRule JSON AST against a flat context object.
 * Supports nested AND/OR/NOT plus comparison operators (gte, lte, eq, gt, lt).
 * Throws on depth exceeding MAX_DEPTH to prevent stack overflow.
 */
export function evaluateRule(
  rule: ConditionRule,
  context: Record<string, string | number | boolean>
): boolean {
  return evaluate(rule, context, 0);
}

function evaluate(
  rule: ConditionRule,
  context: Record<string, string | number | boolean>,
  depth: number
): boolean {
  if (depth > MAX_DEPTH) {
    throw new Error(
      `ConditionRule evaluation exceeded maximum depth of ${MAX_DEPTH}`
    );
  }

  if ('and' in rule) {
    return rule.and.every((sub) => evaluate(sub, context, depth + 1));
  }

  if ('or' in rule) {
    return rule.or.some((sub) => evaluate(sub, context, depth + 1));
  }

  if ('not' in rule) {
    return !evaluate(rule.not, context, depth + 1);
  }

  if ('gte' in rule) {
    const [key, threshold] = rule.gte;
    const val = resolveNumeric(key, context);
    return val >= threshold;
  }

  if ('lte' in rule) {
    const [key, threshold] = rule.lte;
    const val = resolveNumeric(key, context);
    return val <= threshold;
  }

  if ('gt' in rule) {
    const [key, threshold] = rule.gt;
    const val = resolveNumeric(key, context);
    return val > threshold;
  }

  if ('lt' in rule) {
    const [key, threshold] = rule.lt;
    const val = resolveNumeric(key, context);
    return val < threshold;
  }

  if ('eq' in rule) {
    const [key, expected] = rule.eq;
    const val = context[key];
    if (val === undefined) {
      return false;
    }
    return val === expected;
  }

  // Unknown rule shape — treat as false
  return false;
}

function resolveNumeric(
  key: string,
  context: Record<string, string | number | boolean>
): number {
  const val = context[key];
  if (val === undefined) {
    return 0;
  }
  if (typeof val === 'number') {
    return val;
  }
  if (typeof val === 'boolean') {
    return val ? 1 : 0;
  }
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
}
