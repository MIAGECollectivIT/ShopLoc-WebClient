export interface CartItem {
  productUid: string;
  storeUid: string;
  storeName?: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
  maxStock?: number;
}

export interface StoreCartGroup {
  storeUid: string;
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
  productUid: string;
  storeUid: string;
  storeName?: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity?: number;
  maxStock?: number;
}
