export interface Store {
  id?: number;
  name: string;
  address: string;
  url?: string;
  category?: string;
  rib?: string;
  userId?: number;
  [key: string]: unknown;
}

export interface StoreCreateRequest {
  name: string;
  address: string;
  category: string;
  rib: string;
  userId: number;
  url?: string;
}

export interface StoreResponse {
  id: number;
  name: string;
  address: string;
  url?: string;
  category: string;
  rib: string;
  userId: number;
}
