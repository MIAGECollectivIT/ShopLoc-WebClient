export type WalletTransactionType = 'TOPUP' | 'DEBIT';

export interface Wallet {
  id: number;
  userId: string;
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  weeklyReloadRemaining?: number | null;
}

export interface WalletTransaction {
  id: number;
  transactionReference: string;
  amount: number;
  type: WalletTransactionType;
  status: string;
  paymentReference?: string | null;
  storeId?: number | null;
  storeName?: string | null;
  orderReference?: string | null;
  description: string;
  balanceAfter: number;
  idempotencyKey?: string | null;
  createdAt: string;
}

export interface WalletReloadRequest {
  amount: number;
  paymentToken?: string;
  idempotencyKey?: string;
}

export interface WalletDebitRequest {
  amount: number;
  storeId?: number;
  storeName?: string;
  orderReference?: string;
  description?: string;
}
