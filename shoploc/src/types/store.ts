export interface Store {
  id?: number;
  name: string;
  address: string;
  url?: string;
  [key: string]: unknown;
}
