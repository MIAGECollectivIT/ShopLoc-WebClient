export interface Product {
  id: number;
  storeId: number;
  storeUid?: string;
  reference: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  stockQuantity: number;
  alertThreshold?: number;
  isAvailable?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCreateRequest {
  reference: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  stockQuantity?: number;
  alertThreshold?: number;
}

export interface ProductUpdateRequest {
  reference?: string;
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  stockQuantity?: number;
  alertThreshold?: number;
}

export interface StockUpdateRequest {
  quantityDelta?: number;
  delta?: number;
  newQuantity?: number;
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export function getStockStatus(quantity: number, alertThreshold: number = 5): StockStatus {
  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (quantity <= alertThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}
