/**
 * Types TypeScript pour le microservice Loyalty Service.
 * Représente le barème de conversion euros -> points configuré par le commerçant.
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
