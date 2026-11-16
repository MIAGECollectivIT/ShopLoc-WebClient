export interface Store {
  id?: number;
  uid?: string;
  name: string;
  address: string;
  url?: string;
  category?: string;
  rib?: string;
  userId?: number;
  openingHours?: string;
  absenceStartDate?: string;
  absenceEndDate?: string;
  absenceReason?: string;
  isCurrentlyAbsent?: boolean;
  absenceDurationDays?: number;
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

export interface StorePatchRequest {
  name?: string;
  address?: string;
  category?: string;
  rib?: string;
  url?: string;
  openingHours?: string;
  absenceStartDate?: string;
  absenceEndDate?: string;
  absenceReason?: string;
}

export interface StoreResponse {
  id: number;
  uid?: string;
  name: string;
  address: string;
  url?: string;
  category: string;
  rib: string;
  userId: number;
  openingHours?: string;
  absenceStartDate?: string;
  absenceEndDate?: string;
  absenceReason?: string;
  isCurrentlyAbsent?: boolean;
  absenceDurationDays?: number;
  [key: string]: unknown;
}

export interface PartnerAccount {
  id: number;
  name: string;
  email: string;
  companyName?: string;
  role: 'MERCHANT' | 'PARTNER';
  existingStoresCount: number;
}
