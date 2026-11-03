export interface Product {
  id: number;
  storeId: number;
  reference: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  stockQuantity: number;
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
}

export interface ProductUpdateRequest {
  reference?: string;
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  stockQuantity?: number;
}

export interface StockUpdateRequest {
  quantityDelta?: number;
  delta?: number;
  newQuantity?: number;
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export function getStockStatus(quantity: number): StockStatus {
  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (quantity <= 5) return 'LOW_STOCK';
  return 'IN_STOCK';
}
