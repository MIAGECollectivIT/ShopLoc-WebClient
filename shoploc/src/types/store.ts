export interface StoreAbsence {
  uid?: string;
  startDate: string;
  endDate?: string | null;
  reason?: string | null;
  durationDays?: number;
  isCurrentlyActive?: boolean;
  isUpcoming?: boolean;
  isPast?: boolean;
  createdAt?: string;
}

export interface Store {
  uid: string;
  name: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  url?: string;
  category?: string;
  rib?: string;
  ownerUid: string;
  status?: 'ACTIVE' | 'REVOKED';
  revokedAt?: string | null;
  revokedBy?: string | null;
  openingHours?: string;
  absenceStartDate?: string;
  absenceEndDate?: string;
  absenceReason?: string;
  isCurrentlyAbsent?: boolean;
  absenceDurationDays?: number;
  absences?: StoreAbsence[];
  [key: string]: unknown;
}

export interface StoreCreateRequest {
  name: string;
  address: string;
  category: string;
  rib: string;
  ownerUid: string;
  url?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface StorePatchRequest {
  name?: string;
  address?: string;
  category?: string;
  rib?: string;
  url?: string;
  ownerUid?: string;
  openingHours?: string;
  latitude?: number | null;
  longitude?: number | null;
  absenceStartDate?: string;
  absenceEndDate?: string;
  absenceReason?: string;
  clearAbsence?: boolean;
  absences?: StoreAbsence[];
}

export interface StoreResponse {
  uid: string;
  name: string;
  address: string;
  url?: string;
  category: string;
  rib: string;
  ownerUid: string;
  status?: 'ACTIVE' | 'REVOKED';
  revokedAt?: string | null;
  revokedBy?: string | null;
  openingHours?: string;
  absenceStartDate?: string;
  absenceEndDate?: string;
  absenceReason?: string;
  isCurrentlyAbsent?: boolean;
  absenceDurationDays?: number;
  absences?: StoreAbsence[];
  [key: string]: unknown;
}

export interface PartnerAccount {
  publicId: string;
  name: string;
  email: string;
  companyName?: string;
  role: 'MERCHANT' | 'PARTNER';
  existingStoresCount: number;
}
