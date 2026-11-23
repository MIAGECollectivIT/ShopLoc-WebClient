import * as React from 'react';
import {
  getCartItems,
  subscribeCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearStoreFromCart,
  clearCart,
  getCartSummary,
} from '@/lib/cart';
import type { AddToCartPayload, CartItem, CartSummary } from '@/types/cart';

const emptyCart: CartItem[] = [];

export function useCart() {
  const items = React.useSyncExternalStore(subscribeCart, getCartItems, () => emptyCart);

  const summary = React.useMemo<CartSummary>(() => {
    return getCartSummary(items);
  }, [items]);

  const addItem = React.useCallback((payload: AddToCartPayload) => {
    return addToCart(payload);
  }, []);

  const updateQuantity = React.useCallback(
    (productUid: string, storeUid: string, quantity: number) => {
      updateCartQuantity(productUid, storeUid, quantity);
    },
    []
  );

  const removeItem = React.useCallback((productUid: string, storeUid: string) => {
    removeFromCart(productUid, storeUid);
  }, []);

  const clearStore = React.useCallback((storeUid: string) => {
    clearStoreFromCart(storeUid);
  }, []);

  const clear = React.useCallback(() => {
    clearCart();
  }, []);

  return {
    items,
    groupedByStore: summary.groupedByStore,
    totalItemCount: summary.totalItemCount,
    totalPrice: summary.totalPrice,
    storeCount: summary.storeCount,
    isEmpty: items.length === 0,
    addItem,
    updateQuantity,
    removeItem,
    clearStore,
    clear,
  };
}
