export interface Shop {
  id?: number;
  name: string;
  address: string;
  url?: string;
  [key: string]: unknown;
}
