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
  firstName: string;
  lastName: string;
  birthDate: string;
  clientCode: string;
  pickupLocation?: string;
  licensePlates: string[];
  createdAt: string;
  updatedAt: string;
}
