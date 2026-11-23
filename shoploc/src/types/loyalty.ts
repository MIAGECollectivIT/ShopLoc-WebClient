/**
 * TypeScript types for the Loyalty Service microservice.
 * Represents the euros-to-points conversion rate configured by the merchant.
 */

export interface MerchantLoyaltyRate {
  uid?: string | null;
  storeUid: string;
  euroAmount: number;
  pointsReward: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface MerchantLoyaltyRateRequest {
  euroAmount: number;
  pointsReward: number;
}

export interface MerchantLoyaltyRateResponse {
  uid?: string | null;
  storeUid: string;
  euroAmount: number;
  pointsReward: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Dynamic evaluation of customer purchasing activity over a 15-day sliding window
 * for Very Faithful Person (VFP) qualification.
 */
export interface UserActivityEvaluation {
  userId: string;
  transactionCount: number;
  threshold: number;
  isEligibleVfp: boolean;
  windowStart: string;
  windowEnd: string;
}

/**
 * Very Faithful Person (VFP) qualification status and audit timestamps.
 */
export interface UserVfpStatus {
  userId: string;
  isVfp: boolean;
  grantedAt?: string | null;
  revokedAt?: string | null;
  currentTransactionCount: number;
  threshold: number;
  lastEvaluatedAt?: string | null;
}

/**
 * VFP progression metrics, maintenance requirements, and revocation countdown.
 */
export interface UserVfpProgress {
  userId: string;
  isVfp: boolean;
  currentTransactionCount: number;
  threshold: number;
  remainingTransactionsToQualify: number;
  remainingTransactionsToMaintain: number;
  daysRemainingBeforeRevocation?: number | null;
  hoursRemainingBeforeRevocation?: number | null;
  estimatedRevocationDate?: string | null;
  expiringTransactionsCount: number;
  windowStart: string;
  windowEnd: string;
  evaluatedAt: string;
}

export type PointsTransactionType = 'EARN' | 'REDEEM';

/**
 * Loyalty points movement entry returned by Loyalty Service.
 */
export interface PointsTransaction {
  uid: string;
  transactionReference: string;
  storeUid?: string | null;
  storeName?: string | null;
  type: PointsTransactionType;
  points: number;
  balanceAfter: number;
  sourceType?: string | null;
  description?: string | null;
  createdAt: string;
}

/**
 * Customer loyalty points balance and transaction history.
 */
export interface UserPointsBalanceResponse {
  userId: string;
  clientCode?: string | null;
  balance: number;
  points?: number;
  updatedAt: string;
  transactions: PointsTransaction[];
}

export interface ParkingSessionRequest {
  licensePlate: string;
}

export interface ParkingSessionAcknowledgment {
  status: string;
  ticketReference: string;
  licensePlate: string;
  startedAt: string;
  expiresAt: string;
}

export interface VfpDailyEligibility {
  isVfp: boolean;
  eligible: boolean;
  parkingUsedToday: boolean;
  transitUsedToday: boolean;
  consumedBenefitType?: string | null;
  activeParkingSession?: ParkingSessionAcknowledgment | null;
}
