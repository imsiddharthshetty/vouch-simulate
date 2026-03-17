import { LedgerState } from './state';

/**
 * Check conservation: issued = redeemed + leaked + slashed + unredeemed
 * Returns true if conservation holds within floating point tolerance.
 */
export function checkConservation(ledger: LedgerState): boolean {
  const sum =
    ledger.totalRedeemed +
    ledger.totalLeaked +
    ledger.totalSlashed +
    ledger.totalUnredeemed;
  return Math.abs(ledger.totalIssued - sum) < 0.001;
}

/**
 * Enforce conservation — throws if violated.
 */
export function enforceConservation(ledger: LedgerState): void {
  if (!checkConservation(ledger)) {
    const sum =
      ledger.totalRedeemed +
      ledger.totalLeaked +
      ledger.totalSlashed +
      ledger.totalUnredeemed;
    throw new ConservationViolationError(
      `Conservation violated: issued=${ledger.totalIssued}, sum=${sum} (redeemed=${ledger.totalRedeemed} + leaked=${ledger.totalLeaked} + slashed=${ledger.totalSlashed} + unredeemed=${ledger.totalUnredeemed})`
    );
  }
}

export class ConservationViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConservationViolationError';
  }
}

/**
 * Ensure no negative values in ledger and basic sanity checks.
 */
export function validateLedgerValues(ledger: LedgerState): void {
  if (ledger.totalIssued < 0)
    throw new ConservationViolationError('totalIssued cannot be negative');
  if (ledger.totalRedeemed < 0)
    throw new ConservationViolationError('totalRedeemed cannot be negative');
  if (ledger.totalLeaked < 0)
    throw new ConservationViolationError('totalLeaked cannot be negative');
  if (ledger.totalSlashed < 0)
    throw new ConservationViolationError('totalSlashed cannot be negative');
  if (ledger.totalUnredeemed < 0)
    throw new ConservationViolationError('totalUnredeemed cannot be negative');
  if (ledger.totalRedeemed > ledger.totalIssued)
    throw new ConservationViolationError('totalRedeemed exceeds totalIssued');
  if (ledger.totalLeaked > ledger.totalIssued)
    throw new ConservationViolationError('totalLeaked exceeds totalIssued');
}
