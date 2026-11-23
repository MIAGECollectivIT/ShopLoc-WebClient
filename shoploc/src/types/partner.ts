import type { UserRole } from './user';

/**
 * Condensed partner merchant representation for administrative lists and search queries.
 */
export interface AdminPartnerSummary {
  publicId: string;
  name: string;
  email: string;
  companyName?: string;
  role: string;
  existingStoresCount: number;
}

/**
 * Detailed administrative representation of a partner merchant account.
 */
export interface AdminPartnerDetail {
  publicId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  birthDate?: string;
  companyName?: string;
  storeUids: string[];
  createdAt: string;
  updatedAt: string;
}
