export interface LoyaltyGift {
  uid: string;
  storeUid: string;
  storeName?: string | null;
  category?: string | null;
  name: string;
  description?: string | null;
  pointsCost: number;
  stock: number;
  imageUrl?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GiftCreateRequest {
  name: string;
  description?: string;
  pointsCost: number;
  stock?: number;
  imageUrl?: string;
}

export interface GiftUpdateRequest {
  name: string;
  description?: string;
  pointsCost: number;
  imageUrl?: string;
}

export interface GiftStockAdjustRequest {
  delta: number;
}

export type GiftStockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export function getGiftStockStatus(stock: number): GiftStockStatus {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= 5) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export interface PhysicalGiftRedemptionItemRequest {
  giftUid: string;
  quantity: number;
}

export interface PhysicalGiftRedemptionRequest {
  customerId?: string;
  clientCode?: string;
  items: PhysicalGiftRedemptionItemRequest[];
  idempotencyKey?: string;
}

export interface RedeemedGiftItemResponse {
  giftUid: string;
  name: string;
  unitPointsCost: number;
  quantity: number;
  totalPointsCost: number;
}

export interface PhysicalGiftRedemptionResponse {
  transactionReference: string;
  storeUid: string;
  storeName: string;
  customerId: string;
  clientCode?: string | null;
  pointsDeducted: number;
  remainingBalance: number;
  redeemedAt: string;
  items: RedeemedGiftItemResponse[];
}
