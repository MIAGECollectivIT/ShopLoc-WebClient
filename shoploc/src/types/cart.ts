export type CartItemType = 'PRODUCT' | 'GIFT';

export interface CartItem {
  productUid: string;
  storeUid: string;
  storeName?: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
  maxStock?: number;
  itemType?: CartItemType;
  pointsCost?: number;
}

export interface StoreCartGroup {
  storeUid: string;
  storeName: string;
  items: CartItem[];
  subtotal: number;
  pointsSubtotal: number;
  itemCount: number;
}

export interface CartSummary {
  items: CartItem[];
  groupedByStore: StoreCartGroup[];
  totalItemCount: number;
  totalPrice: number;
  totalPointsCost: number;
  storeCount: number;
}

export interface AddToCartPayload {
  productUid: string;
  storeUid: string;
  storeName?: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity?: number;
  maxStock?: number;
  itemType?: CartItemType;
  pointsCost?: number;
}
