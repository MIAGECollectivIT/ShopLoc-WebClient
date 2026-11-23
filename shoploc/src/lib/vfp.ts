import type { UserPaymentTransaction } from '@/types/payment';

export interface VfpRevocationForecast {
  revocationDate: Date;
  daysRemaining: number;
  hoursRemaining: number;
  totalDaysCeil: number;
  transactionsExpiringBeforeRevocation: number;
  criticalTransactionDate: Date;
}

/**
 * Calculates when the user's VFP status will be revoked in the current state (without new purchases).
 * Evaluates the 15-day sliding window: each purchase expires exactly 15 days after its creation.
 * The status is revoked as soon as the total count of valid transactions within the window drops below threshold (10).
 */
export function calculateVfpRevocationForecast(
  transactions: UserPaymentTransaction[],
  threshold = 10,
  windowDays = 15,
  now: Date = new Date()
): VfpRevocationForecast | null {
  if (!transactions || transactions.length === 0) {
    return null;
  }

  // Filter approved transactions within the current sliding window
  const windowStartMs = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const approvedTx = transactions
    .filter((t) => {
      if (t.status && t.status !== 'TRANSACTION_APPROVED') return false;
      const txTime = new Date(t.createdAt).getTime();
      return !isNaN(txTime) && txTime >= windowStartMs && txTime <= now.getTime();
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (approvedTx.length < threshold) {
    return null;
  }

  // The critical transaction whose expiration triggers the drop below threshold is at index (approvedTx.length - threshold).
  const criticalIndex = approvedTx.length - threshold;
  const criticalTx = approvedTx[criticalIndex];
  if (!criticalTx) return null;

  const criticalTxDate = new Date(criticalTx.createdAt);
  const revocationDate = new Date(criticalTxDate.getTime() + windowDays * 24 * 60 * 60 * 1000);
  const msRemaining = Math.max(0, revocationDate.getTime() - now.getTime());

  const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const totalDaysCeil = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  const transactionsExpiringBeforeRevocation = criticalIndex + 1;

  return {
    revocationDate,
    daysRemaining,
    hoursRemaining,
    totalDaysCeil,
    transactionsExpiringBeforeRevocation,
    criticalTransactionDate: criticalTxDate,
  };
}

export function formatRevocationCountdown(forecast: VfpRevocationForecast): string {
  if (forecast.daysRemaining > 0) {
    return `${forecast.daysRemaining} jour${forecast.daysRemaining > 1 ? 's' : ''}${
      forecast.hoursRemaining > 0 ? ` et ${forecast.hoursRemaining} h` : ''
    }`;
  }
  if (forecast.hoursRemaining > 0) {
    return `${forecast.hoursRemaining} heure${forecast.hoursRemaining > 1 ? 's' : ''}`;
  }
  return "moins d'une heure";
}
