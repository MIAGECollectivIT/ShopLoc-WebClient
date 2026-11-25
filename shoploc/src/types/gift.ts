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
  vfpExclusive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GiftCreateRequest {
  name: string;
  description?: string;
  pointsCost: number;
  stock?: number;
  imageUrl?: string;
  vfpExclusive?: boolean;
}

export interface GiftUpdateRequest {
  name: string;
  description?: string;
  pointsCost: number;
  imageUrl?: string;
  vfpExclusive?: boolean;
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
