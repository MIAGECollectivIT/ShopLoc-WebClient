/**
 * Type definitions for in-store physical checkout sales transactions and loyalty points attribution.
 */

export interface PhysicalSaleRequest {
  storeUid: string;
  clientCode: string;
  customerId?: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
}

export interface PhysicalSaleResponse {
  uid: string;
  transactionReference: string;
  storeUid: string;
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

export interface StoreTurnoverResponse {
  storeUid: string;
  currency: string;
  monthlyTurnover: number;
  annualTurnover: number;
  totalTurnover: number;
  completedTransactionsCount: number;
}
