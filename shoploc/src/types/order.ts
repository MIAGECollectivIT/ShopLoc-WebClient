export type OrderStatus =
  'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'DELIVERED' | 'COMPLETED' | 'EXPIRED';

export type OrderItemType = 'PRODUCT' | 'GIFT';

export interface CreateOrderItemRequest {
  storeUid: string;
  storeName: string;
  productUid: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  itemType?: OrderItemType;
}

export interface CreateOrderRequest {
  items: CreateOrderItemRequest[];
  clientCode?: string | null;
  customerEmail?: string | null;
}

export interface OrderItemResponse {
  uid: string;
  storeUid: string;
  storeName: string;
  productUid: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  itemType?: OrderItemType;
  pointsCost?: number;
}

export interface OrderStoreSummaryResponse {
  storeUid: string;
  storeName: string;
  subtotal: number;
  itemCount: number;
  items: OrderItemResponse[];
}

export interface OrderResponse {
  uid: string;
  orderReference: string;
  customerId: string;
  customerEmail: string;
  clientCode?: string | null;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  expiresAt: string;
  createdAt: string;
  storeSummaries: OrderStoreSummaryResponse[];
  items: OrderItemResponse[];
  receiptSentAt?: string | null;
  updatedAt?: string | null;
  totalPointsCost?: number;
}
