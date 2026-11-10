export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'DELIVERED';

export interface CreateOrderItemRequest {
  storeId: number;
  storeName: string;
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface CreateOrderRequest {
  items: CreateOrderItemRequest[];
  clientCode?: string | null;
  customerEmail?: string | null;
}

export interface OrderItemResponse {
  id: number;
  storeId: number;
  storeName: string;
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface OrderStoreSummaryResponse {
  storeId: number;
  storeName: string;
  subtotal: number;
  itemCount: number;
  items: OrderItemResponse[];
}

export interface OrderResponse {
  id: number;
  orderReference: string;
  uid?: string;
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
}
