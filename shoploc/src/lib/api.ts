import type { Store } from '@/types/store';
import 'dotenv/config';

export function getApiEndpoint(path: string): string {
  const base =
    (typeof process !== 'undefined' &&
      (process.env?.STORE_SERVICE_URL || process.env?.INTERNAL_API_URL)) ||
    'http://localhost:8080';

  return `${base.replace(/\/$/, '')}${path}`;
}

export async function getStores(): Promise<Store[]> {
  const res = await fetch(getApiEndpoint('/v1/stores'));
  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status}`);
  }
  const data: Store[] = await res.json();
  return data;
}

export async function getStoreById(id: string | number): Promise<Store> {
  const res = await fetch(getApiEndpoint(`/v1/stores/${id}`));
  if (!res.ok) {
    throw new Error(`Store not found (${res.status})`);
  }
  const data: Store = await res.json();
  return data;
}
