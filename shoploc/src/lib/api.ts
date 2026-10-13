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

function getApiEndpoint(path: string): string {
  const base =
    (typeof process !== 'undefined' && process.env?.INTERNAL_API_URL) || 'http://localhost:8080';

  return `${base.replace(/\/$/, '')}${path}`;
}

export async function getShops(): Promise<Shop[]> {
  const res = await fetch(getApiEndpoint('/api/v1/stores'));
  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status}`);
  }
  const data: Shop[] = await res.json();
  return data.map(normalizeShop);
}

export async function getShopById(id: string | number): Promise<Shop> {
  const res = await fetch(getApiEndpoint(`/api/v1/stores/${id}`));
  if (!res.ok) {
    throw new Error(`Shop not found (${res.status})`);
  }
  const data: Shop = await res.json();
  return normalizeShop(data);
}
