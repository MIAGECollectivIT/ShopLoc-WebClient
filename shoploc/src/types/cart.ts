export interface CartItem {
  productId: number;
  storeId: number;
  storeUid?: string;
  storeName?: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
  maxStock?: number;
}

export interface StoreCartGroup {
  storeId: number;
  storeUid?: string;
  storeName: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export interface CartSummary {
  items: CartItem[];
  groupedByStore: StoreCartGroup[];
  totalItemCount: number;
  totalPrice: number;
  storeCount: number;
}

export interface AddToCartPayload {
  productId: number;
  storeId: number;
  storeUid?: string;
  storeName?: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity?: number;
  maxStock?: number;
}
