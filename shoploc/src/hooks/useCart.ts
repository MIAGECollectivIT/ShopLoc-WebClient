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
    (productId: number, storeId: number, quantity: number) => {
      updateCartQuantity(productId, storeId, quantity);
    },
    []
  );

  const removeItem = React.useCallback((productId: number, storeId: number) => {
    removeFromCart(productId, storeId);
  }, []);

  const clearStore = React.useCallback((storeId: number) => {
    clearStoreFromCart(storeId);
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
