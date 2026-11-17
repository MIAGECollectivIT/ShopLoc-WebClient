import type { CartItem, StoreCartGroup, CartSummary, AddToCartPayload } from '@/types/cart';

export const CART_STORAGE_KEY = 'shoploc_cart';
export const CART_UPDATED_EVENT = 'shoploc-cart-updated';

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

let memoryCart: CartItem[] | null = null;
const listeners = new Set<() => void>();

function readLocalStorage(): CartItem[] {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.productId === 'number' &&
        typeof item.storeId === 'number' &&
        typeof item.name === 'string' &&
        typeof item.price === 'number' &&
        typeof item.quantity === 'number' &&
        item.quantity > 0
    );
  } catch (error) {
    console.warn('[ShopLoc Cart] Impossible de lire le panier depuis le LocalStorage:', error);
    return [];
  }
}

function writeLocalStorage(items: CartItem[]): void {
  memoryCart = items;
  if (!isBrowser) return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('[ShopLoc Cart] Erreur lors de l’écriture dans le LocalStorage:', error);
  }
}

export function notifyCartListeners(): void {
  if (isBrowser) {
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
  }
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('[ShopLoc Cart] Erreur dans un listener de panier:', e);
    }
  });
}

/**
 * Récupère les articles actuels du panier.
 */
export function getCartItems(): CartItem[] {
  if (memoryCart === null) {
    memoryCart = readLocalStorage();
  }
  return memoryCart;
}

/**
 * Sauvegarde directement une liste d'articles et notifie les observateurs.
 */
export function setCartItems(items: CartItem[]): void {
  writeLocalStorage(items);
  notifyCartListeners();
}

/**
 * S'abonne aux changements du panier (au sein de l'application et entre onglets).
 */
export function subscribeCart(callback: () => void): () => void {
  listeners.add(callback);

  if (!isBrowser) {
    return () => {
      listeners.delete(callback);
    };
  }

  const handleCustomEvent = () => {
    memoryCart = readLocalStorage();
    callback();
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY) {
      memoryCart = readLocalStorage();
      callback();
    }
  };

  window.addEventListener(CART_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    listeners.delete(callback);
    window.removeEventListener(CART_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Ajoute un article dans le panier (avec contrôle strict du stock max si fourni).
 */
export function addToCart(payload: AddToCartPayload): {
  success: boolean;
  item?: CartItem;
  quantityAdded?: number;
  message?: string;
} {
  const current = [...getCartItems()];
  const quantityToAdd = payload.quantity && payload.quantity > 0 ? payload.quantity : 1;

  if (payload.maxStock !== undefined && payload.maxStock <= 0) {
    return { success: false, message: 'Cet article est en rupture de stock.' };
  }

  const existingIndex = current.findIndex(
    (item) => item.productId === payload.productId && item.storeId === payload.storeId
  );

  let updatedItem: CartItem;
  let quantityAdded = quantityToAdd;

  if (existingIndex >= 0) {
    const existing = current[existingIndex];
    const maxStock = payload.maxStock ?? existing.maxStock;

    if (maxStock !== undefined && existing.quantity >= maxStock) {
      return {
        success: false,
        message: `Stock maximum (${maxStock}) déjà atteint dans votre panier.`,
      };
    }

    let newQuantity = existing.quantity + quantityToAdd;
    if (maxStock !== undefined && newQuantity > maxStock) {
      quantityAdded = maxStock - existing.quantity;
      newQuantity = maxStock;
    }

    updatedItem = {
      ...existing,
      quantity: newQuantity,
      maxStock: maxStock ?? existing.maxStock,
      price: payload.price, // Assure le dernier prix à jour
      imageUrl: payload.imageUrl !== undefined ? payload.imageUrl : existing.imageUrl,
      storeName: payload.storeName || existing.storeName,
      storeUid: payload.storeUid || existing.storeUid,
    };
    current[existingIndex] = updatedItem;
  } else {
    let finalQty = quantityToAdd;
    if (payload.maxStock !== undefined && finalQty > payload.maxStock) {
      quantityAdded = payload.maxStock;
      finalQty = payload.maxStock;
    }
    updatedItem = {
      productId: payload.productId,
      storeId: payload.storeId,
      storeUid: payload.storeUid,
      storeName: payload.storeName || 'Boutique partenaire',
      name: payload.name,
      price: payload.price,
      imageUrl: payload.imageUrl,
      quantity: finalQty,
      maxStock: payload.maxStock,
    };
    current.push(updatedItem);
  }

  setCartItems(current);
  return { success: true, item: updatedItem, quantityAdded };
}

/**
 * Met à jour la quantité d'un article existant.
 * Si quantity <= 0, l'article est supprimé.
 */
export function updateCartQuantity(productId: number, storeId: number, quantity: number): void {
  const current = getCartItems();
  if (quantity <= 0) {
    removeFromCart(productId, storeId);
    return;
  }

  const updated = current.map((item) => {
    if (item.productId === productId && item.storeId === storeId) {
      const maxStock = item.maxStock;
      const targetQuantity = maxStock !== undefined ? Math.min(quantity, maxStock) : quantity;
      return { ...item, quantity: targetQuantity };
    }
    return item;
  });

  setCartItems(updated);
}

/**
 * Supprime un article du panier.
 */
export function removeFromCart(productId: number, storeId: number): void {
  const current = getCartItems();
  const next = current.filter(
    (item) => !(item.productId === productId && item.storeId === storeId)
  );
  setCartItems(next);
}

/**
 * Supprime tous les articles d'un commerce spécifique.
 */
export function clearStoreFromCart(storeId: number): void {
  const current = getCartItems();
  const next = current.filter((item) => item.storeId !== storeId);
  setCartItems(next);
}

/**
 * Vide complètement le panier.
 */
export function clearCart(): void {
  setCartItems([]);
}

/**
 * Regroupe les articles par commerce partenaire (partitionnement multi-commerces).
 */
export function groupCartByStore(items: CartItem[]): StoreCartGroup[] {
  const map = new Map<number, StoreCartGroup>();

  for (const item of items) {
    let group = map.get(item.storeId);
    if (!group) {
      group = {
        storeId: item.storeId,
        storeUid: item.storeUid,
        storeName: item.storeName || `Commerce #${item.storeId}`,
        items: [],
        subtotal: 0,
        itemCount: 0,
      };
      map.set(item.storeId, group);
    }
    group.items.push(item);
    group.itemCount += item.quantity;
    group.subtotal = Number((group.subtotal + item.price * item.quantity).toFixed(2));
  }

  return Array.from(map.values());
}

/**
 * Calcule la synthèse complète du panier (articles, groupement, total et comptage).
 */
export function getCartSummary(items: CartItem[]): CartSummary {
  const grouped = groupCartByStore(items);
  let totalItemCount = 0;
  let totalPrice = 0;

  for (const group of grouped) {
    totalItemCount += group.itemCount;
    totalPrice = Number((totalPrice + group.subtotal).toFixed(2));
  }

  return {
    items,
    groupedByStore: grouped,
    totalItemCount,
    totalPrice,
    storeCount: grouped.length,
  };
}
