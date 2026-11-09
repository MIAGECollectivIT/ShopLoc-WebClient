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
