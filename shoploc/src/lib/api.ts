import type { Shop } from '@/types/shop';
import 'dotenv/config';

export function normalizeShop(shop: Shop): Shop {
  if (shop.url && shop.url.includes('wikipedia.org/wiki/Fichier:Burger_King_logo')) {
    return {
      ...shop,
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Burger_King_logo_%281999%E2%80%932020%29.svg',
    };
  }
  return shop;
}

const STORE_SERVICE_URL =
  import.meta.env.PUBLIC_STORE_SERVICE_URL ||
  process.env.PUBLIC_STORE_SERVICE_URL ||
  import.meta.env.PUBLIC_API_URL ||
  process.env.PUBLIC_API_URL ||
  'http://localhost:8080/api/shops';

export async function getShops(): Promise<Shop[]> {
  const res = await fetch(STORE_SERVICE_URL);
  if (!res.ok) {
    throw new Error(`Erreur HTTP: ${res.status}`);
  }
  const data: Shop[] = await res.json();
  return data.map(normalizeShop);
}

export async function getShopById(id: string | number): Promise<Shop> {
  const res = await fetch(`${STORE_SERVICE_URL}/${id}`);
  if (!res.ok) {
    throw new Error(`Boutique introuvable (${res.status})`);
  }
  const data: Shop = await res.json();
  return normalizeShop(data);
}
