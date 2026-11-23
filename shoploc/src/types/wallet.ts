export type WalletTransactionType = 'TOPUP' | 'DEBIT';

export interface Wallet {
  uid: string;
  userId: string;
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  weeklyReloadRemaining?: number | null;
}

export interface WalletTransaction {
  uid: string;
  transactionReference: string;
  amount: number;
  type: WalletTransactionType;
  status: string;
  paymentReference?: string | null;
  storeUid?: string | null;
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
  storeUid?: string;
  storeName?: string;
  orderReference?: string;
  description?: string;
}
