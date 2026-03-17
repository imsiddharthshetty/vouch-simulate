import { describe, it, expect } from 'vitest';
import { evaluateRule } from '../../src/core/rules';
import type { ConditionRule } from '../../src/core/state';

const context = {
  age: 25,
  income: 50000,
  eligible: true,
  status: 'active',
  score: 0.75,
};

describe('evaluateRule', () => {
  it('handles "and" with all true', () => {
    const rule: ConditionRule = {
      and: [
        { gte: ['age', 18] },
        { lte: ['income', 100000] },
      ],
    };
    expect(evaluateRule(rule, context)).toBe(true);
  });

  it('handles "and" with one false', () => {
    const rule: ConditionRule = {
      and: [
        { gte: ['age', 18] },
        { lte: ['income', 10000] }, // income is 50000, so this is false
      ],
    };
    expect(evaluateRule(rule, context)).toBe(false);
  });

  it('handles "or" with one true', () => {
    const rule: ConditionRule = {
      or: [
        { gt: ['age', 100] }, // false
        { eq: ['status', 'active'] }, // true
      ],
    };
    expect(evaluateRule(rule, context)).toBe(true);
  });

  it('handles "or" with all false', () => {
    const rule: ConditionRule = {
      or: [
        { gt: ['age', 100] },
        { eq: ['status', 'inactive'] },
      ],
    };
    expect(evaluateRule(rule, context)).toBe(false);
  });

  it('handles "not" negation', () => {
    const rule: ConditionRule = {
      not: { eq: ['status', 'inactive'] },
    };
    expect(evaluateRule(rule, context)).toBe(true);
  });

  it('handles "not" negation of true condition', () => {
    const rule: ConditionRule = {
      not: { eq: ['status', 'active'] },
    };
    expect(evaluateRule(rule, context)).toBe(false);
  });

  it('handles gte comparison', () => {
    expect(evaluateRule({ gte: ['age', 25] }, context)).toBe(true);
    expect(evaluateRule({ gte: ['age', 26] }, context)).toBe(false);
  });

  it('handles lte comparison', () => {
    expect(evaluateRule({ lte: ['age', 25] }, context)).toBe(true);
    expect(evaluateRule({ lte: ['age', 24] }, context)).toBe(false);
  });

  it('handles eq comparison with number', () => {
    expect(evaluateRule({ eq: ['age', 25] }, context)).toBe(true);
    expect(evaluateRule({ eq: ['age', 26] }, context)).toBe(false);
  });

  it('handles eq comparison with string', () => {
    expect(evaluateRule({ eq: ['status', 'active'] }, context)).toBe(true);
    expect(evaluateRule({ eq: ['status', 'inactive'] }, context)).toBe(false);
  });

  it('handles eq comparison with boolean', () => {
    expect(evaluateRule({ eq: ['eligible', true] }, context)).toBe(true);
    expect(evaluateRule({ eq: ['eligible', false] }, context)).toBe(false);
  });

  it('handles gt comparison', () => {
    expect(evaluateRule({ gt: ['age', 24] }, context)).toBe(true);
    expect(evaluateRule({ gt: ['age', 25] }, context)).toBe(false);
  });

  it('handles lt comparison', () => {
    expect(evaluateRule({ lt: ['age', 26] }, context)).toBe(true);
    expect(evaluateRule({ lt: ['age', 25] }, context)).toBe(false);
  });

  it('handles nested rules (and containing or)', () => {
    const rule: ConditionRule = {
      and: [
        { gte: ['age', 18] },
        {
          or: [
            { eq: ['status', 'active'] },
            { gt: ['income', 100000] },
          ],
        },
      ],
    };
    expect(evaluateRule(rule, context)).toBe(true);
  });

  it('handles deeply nested rules (not inside and inside or)', () => {
    const rule: ConditionRule = {
      or: [
        {
          and: [
            { not: { eq: ['status', 'inactive'] } },
            { gte: ['score', 0.5] },
          ],
        },
        { lt: ['age', 10] },
      ],
    };
    expect(evaluateRule(rule, context)).toBe(true);
  });

  it('returns false for eq on undefined key', () => {
    expect(evaluateRule({ eq: ['nonexistent', 'value'] }, context)).toBe(false);
  });

  it('resolves numeric 0 for undefined key in gte/lte/gt/lt', () => {
    expect(evaluateRule({ gte: ['nonexistent', 0] }, context)).toBe(true);
    expect(evaluateRule({ gt: ['nonexistent', 0] }, context)).toBe(false);
  });

  it('throws on depth > 20', () => {
    // Build a rule nested 22 levels deep
    let rule: ConditionRule = { eq: ['age', 25] };
    for (let i = 0; i < 22; i++) {
      rule = { not: rule };
    }
    expect(() => evaluateRule(rule, context)).toThrowError(
      /exceeded maximum depth/
    );
  });

  it('does not throw at exactly depth 20', () => {
    // Build a rule nested exactly 20 levels deep (depth goes 0..20, throws at >20 = 21)
    let rule: ConditionRule = { eq: ['age', 25] };
    for (let i = 0; i < 20; i++) {
      rule = { not: rule };
    }
    // This nests 20 "not" wrappers. The leaf is at depth 20 which equals MAX_DEPTH.
    // evaluate is called with depth 0 for the outermost, incrementing to depth 20 for the leaf.
    // The check is depth > 20, so depth=20 should NOT throw.
    expect(() => evaluateRule(rule, context)).not.toThrow();
  });
});
