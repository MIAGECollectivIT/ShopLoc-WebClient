/**
 * Type definitions for in-store physical checkout sales transactions and loyalty points attribution.
 */

export interface PhysicalSaleRequest {
  storeId: number;
  clientCode: string;
  customerId?: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
}

export interface PhysicalSaleResponse {
  transactionReference: string;
  storeId: number;
  merchantId: string;
  clientCode: string;
  customerId?: string;
  amount: number;
  currency: string;
  pointsEarned: number;
  pointsRateApplied: string;
  paymentMethod: string;
  status: string;
  timestamp: string;
}
