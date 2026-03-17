import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  checkConservation,
  enforceConservation,
  validateLedgerValues,
  ConservationViolationError,
} from '../../src/core/conservation';
import type { LedgerState } from '../../src/core/state';

function makeLedger(overrides: Partial<LedgerState> = {}): LedgerState {
  return {
    totalIssued: 1000,
    totalRedeemed: 400,
    totalLeaked: 100,
    totalSlashed: 50,
    totalUnredeemed: 450,
    ...overrides,
  };
}

describe('checkConservation', () => {
  it('returns true when ledger balances', () => {
    // 1000 = 400 + 100 + 50 + 450
    const ledger = makeLedger();
    expect(checkConservation(ledger)).toBe(true);
  });

  it('returns true when values are zero and balanced', () => {
    const ledger = makeLedger({
      totalIssued: 0,
      totalRedeemed: 0,
      totalLeaked: 0,
      totalSlashed: 0,
      totalUnredeemed: 0,
    });
    expect(checkConservation(ledger)).toBe(true);
  });

  it('returns true within floating point tolerance', () => {
    // Sum will be 999.9995 due to floating point, which is within 0.001 tolerance
    const ledger = makeLedger({
      totalIssued: 1000,
      totalRedeemed: 333.3333,
      totalLeaked: 333.3333,
      totalSlashed: 0,
      totalUnredeemed: 333.3334,
    });
    expect(checkConservation(ledger)).toBe(true);
  });

  it('returns false when ledger does not balance', () => {
    const ledger = makeLedger({
      totalIssued: 1000,
      totalRedeemed: 400,
      totalLeaked: 100,
      totalSlashed: 50,
      totalUnredeemed: 500, // should be 450
    });
    expect(checkConservation(ledger)).toBe(false);
  });

  it('returns false when issued is less than sum of parts', () => {
    const ledger = makeLedger({
      totalIssued: 500,
      totalRedeemed: 400,
      totalLeaked: 100,
      totalSlashed: 50,
      totalUnredeemed: 450,
    });
    expect(checkConservation(ledger)).toBe(false);
  });
});

describe('enforceConservation', () => {
  it('throws ConservationViolationError on violation', () => {
    const ledger = makeLedger({
      totalIssued: 1000,
      totalRedeemed: 400,
      totalLeaked: 100,
      totalSlashed: 50,
      totalUnredeemed: 999, // broken
    });
    expect(() => enforceConservation(ledger)).toThrowError(
      ConservationViolationError
    );
    expect(() => enforceConservation(ledger)).toThrowError(
      /Conservation violated/
    );
  });

  it('passes on valid ledger', () => {
    const ledger = makeLedger();
    expect(() => enforceConservation(ledger)).not.toThrow();
  });
});

describe('validateLedgerValues', () => {
  it('rejects negative totalIssued', () => {
    const ledger = makeLedger({ totalIssued: -1 });
    expect(() => validateLedgerValues(ledger)).toThrowError(
      ConservationViolationError
    );
    expect(() => validateLedgerValues(ledger)).toThrowError(
      /totalIssued cannot be negative/
    );
  });

  it('rejects negative totalRedeemed', () => {
    const ledger = makeLedger({ totalRedeemed: -1 });
    expect(() => validateLedgerValues(ledger)).toThrowError(
      /totalRedeemed cannot be negative/
    );
  });

  it('rejects negative totalLeaked', () => {
    const ledger = makeLedger({ totalLeaked: -1 });
    expect(() => validateLedgerValues(ledger)).toThrowError(
      /totalLeaked cannot be negative/
    );
  });

  it('rejects negative totalSlashed', () => {
    const ledger = makeLedger({ totalSlashed: -1 });
    expect(() => validateLedgerValues(ledger)).toThrowError(
      /totalSlashed cannot be negative/
    );
  });

  it('rejects negative totalUnredeemed', () => {
    const ledger = makeLedger({ totalUnredeemed: -1 });
    expect(() => validateLedgerValues(ledger)).toThrowError(
      /totalUnredeemed cannot be negative/
    );
  });

  it('rejects redeemed > issued', () => {
    const ledger = makeLedger({
      totalIssued: 100,
      totalRedeemed: 200,
    });
    expect(() => validateLedgerValues(ledger)).toThrowError(
      /totalRedeemed exceeds totalIssued/
    );
  });

  it('rejects leaked > issued', () => {
    const ledger = makeLedger({
      totalIssued: 100,
      totalRedeemed: 50,
      totalLeaked: 200,
      totalSlashed: 0,
      totalUnredeemed: 0,
    });
    expect(() => validateLedgerValues(ledger)).toThrowError(
      /totalLeaked exceeds totalIssued/
    );
  });

  it('passes for a valid ledger', () => {
    const ledger = makeLedger();
    expect(() => validateLedgerValues(ledger)).not.toThrow();
  });
});

describe('conservation property test', () => {
  it('conservation holds for any valid sequence of value movements', () => {
    fc.assert(
      fc.property(
        fc.nat(100000), // totalIssued (0 to 100000)
        fc.array(
          fc.record({
            redeemed: fc.nat(1000),
            leaked: fc.nat(1000),
            slashed: fc.nat(1000),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (totalIssued, movements) => {
          // Start with all value unredeemed
          let redeemed = 0;
          let leaked = 0;
          let slashed = 0;
          let unredeemed = totalIssued;

          for (const move of movements) {
            // Only move what is available from unredeemed
            const available = unredeemed;
            const totalMove = move.redeemed + move.leaked + move.slashed;
            if (totalMove === 0 || available === 0) continue;

            // Scale movements to fit within available
            const scale = Math.min(1, available / totalMove);
            const dr = move.redeemed * scale;
            const dl = move.leaked * scale;
            const ds = move.slashed * scale;

            redeemed += dr;
            leaked += dl;
            slashed += ds;
            unredeemed -= dr + dl + ds;
          }

          const ledger: LedgerState = {
            totalIssued: totalIssued,
            totalRedeemed: redeemed,
            totalLeaked: leaked,
            totalSlashed: slashed,
            totalUnredeemed: unredeemed,
          };

          // Conservation should always hold for properly constructed movements
          return checkConservation(ledger);
        }
      ),
      { numRuns: 500 }
    );
  });
});
