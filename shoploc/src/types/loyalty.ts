/**
 * TypeScript types for the Loyalty Service microservice.
 * Represents the euros-to-points conversion rate configured by the merchant.
 */

export interface MerchantLoyaltyRate {
  id?: number | null;
  storeId: number;
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
  id?: number | null;
  storeId: number;
  euroAmount: number;
  pointsReward: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Dynamic evaluation of customer purchasing activity over a 15-day sliding window
 * for Very Faithful Person (VFP) qualification (SLE-44 / SLE-164).
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
 * Very Faithful Person (VFP) qualification status and audit timestamps (SLE-45 / SLE-204).
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

export type PointsTransactionType = 'EARN' | 'REDEEM';

/**
 * Loyalty points movement entry returned by Loyalty Service (SLE-38 / SLE-176).
 */
export interface PointsTransaction {
  id: number;
  transactionReference: string;
  storeId?: number | null;
  storeName?: string | null;
  type: PointsTransactionType;
  points: number;
  balanceAfter: number;
  sourceType?: string | null;
  description?: string | null;
  createdAt: string;
}

/**
 * Customer loyalty points balance and transaction history (SLE-38 / SLE-176 / SLE-177 / SLE-178).
 */
export interface UserPointsBalanceResponse {
  userId: string;
  clientCode?: string | null;
  balance: number;
  points?: number;
  updatedAt: string;
  transactions: PointsTransaction[];
}
