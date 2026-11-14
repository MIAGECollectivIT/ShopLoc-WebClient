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
