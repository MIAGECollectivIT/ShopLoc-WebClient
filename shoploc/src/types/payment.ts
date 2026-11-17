export type PaymentAuthorizationStatus = 'TRANSACTION_APPROVED' | 'FAILED';

export interface PaymentAuthorizationRequest {
  amount: number;
  currency: string;
  reference: string;
  paymentToken: string;
}

export interface PaymentAuthorizationResponse {
  status: PaymentAuthorizationStatus;
  authorizationCode: string;
  transactionId: string;
  amount: number;
  currency: string;
  reference: string;
  timestamp: string;
  rule: string;
  paymentMethod?: string;
}

export interface UserPaymentTransaction {
  transactionId: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  authorizationCode: string;
  createdAt: string;
}
