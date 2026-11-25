export type UserRole = 'CLIENT' | 'MERCHANT' | 'ADMIN';

export interface UserRegistrationRequest {
  firstName: string;
  lastName: string;
  birthDate: string; // ISO date string: YYYY-MM-DD
  email: string;
  password: string;
  pickupLocation?: string;
  licensePlates?: string[];
}

export interface UserLoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  isLocked?: boolean;
  firstName: string;
  lastName: string;
  birthDate: string;
  clientCode?: string;
  pickupLocation?: string;
  licensePlates?: string[];
  createdAt: string;
  updatedAt: string;
  storesCount?: number;
}

export interface AdminUserUpdateRequest {
  firstName: string;
  lastName: string;
  email: string;
  role?: UserRole;
}

export interface AdminUserPageResponse {
  content: UserResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  clientCode?: string;
  birthDate?: string;
  pickupLocation?: string;
  licensePlates?: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  clientCode?: string;
  birthDate?: string;
  pickupLocation?: string;
  licensePlates?: string[];
}

export interface VehicleResponse {
  vehicleId: string;
  licensePlate: string;
}

export interface CustomerIdentificationResponse {
  publicId: string;
  clientCode: string;
  firstName: string;
  lastNameMasked: string;
  emailMasked: string;
  recognized: boolean;
  memberSinceYear?: number;
}
