import type {
  UserRegistrationRequest,
  UserLoginRequest,
  UserResponse,
  AuthResponse,
  UserRole,
  AdminUserUpdateRequest,
  AdminUserPageResponse,
  VehicleResponse,
  CustomerIdentificationResponse,
} from '@/types/user';
import type { PartnerAccount } from '@/types/store';
import type { AdminPartnerSummary, AdminPartnerDetail } from '@/types/partner';
import type { CitizenCardEmailSettingResponse } from '@/types/settings';
import {
  getAuthToken,
  getAuthUser,
  setAuthSession,
  clearAuthSession,
  updateAuthUser,
} from '../auth';
import { fetchWithTimeout, getUsersApiEndpoint } from './core';

export async function getPartners(query?: string, limit: number = 20): Promise<PartnerAccount[]> {
  const trimmed = query?.trim() || '';
  const searchParams = new URLSearchParams();
  if (trimmed) {
    searchParams.set('query', trimmed);
  }
  searchParams.set('limit', String(limit));

  const endpoint = getUsersApiEndpoint(`/v1/users/partners?${searchParams.toString()}`);
  const token = getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Impossible de récupérer la liste des partenaires (HTTP ${res.status})`);
  }

  const partners: PartnerAccount[] = await res.json();
  return partners;
}

/**
 * Retrieves partner accounts for administrative management.
 * Restricted to administrators. Supports query filtering.
 */

export async function getAdminPartners(
  query?: string,
  limit: number = 50,
  authToken?: string
): Promise<AdminPartnerSummary[]> {
  const trimmed = query?.trim() || '';
  const searchParams = new URLSearchParams();
  if (trimmed) {
    searchParams.set('query', trimmed);
  }
  searchParams.set('limit', String(limit));

  const endpoint = getUsersApiEndpoint(`/v1/admin/partners?${searchParams.toString()}`);
  const token = authToken || getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    throw new Error('Authentification requise pour accéder à la liste des partenaires.');
  }
  if (res.status === 403) {
    throw new Error('Accès réservé aux administrateurs de la plateforme.');
  }
  if (!res.ok) {
    throw new Error(`Impossible de récupérer les partenaires administratifs (HTTP ${res.status})`);
  }

  const partners: AdminPartnerSummary[] = await res.json();
  return partners;
}

/**
 * Retrieves all registered users with multi-criteria filtering and pagination.
 * Restricted to administrators.
 */

export async function getAdminUsers(params?: {
  query?: string;
  role?: UserRole;
  locked?: boolean;
  eligibleForStore?: boolean;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  authToken?: string;
}): Promise<AdminUserPageResponse> {
  const searchParams = new URLSearchParams();
  if (params?.query && params.query.trim()) {
    searchParams.set('query', params.query.trim());
  }
  if (params?.role) {
    searchParams.set('role', params.role);
  }
  if (params?.locked !== undefined) {
    searchParams.set('locked', String(params.locked));
  }
  if (params?.eligibleForStore !== undefined) {
    searchParams.set('eligibleForStore', String(params.eligibleForStore));
  }
  if (params?.from) {
    searchParams.set('from', params.from);
  }
  if (params?.to) {
    searchParams.set('to', params.to);
  }
  if (params?.page !== undefined) {
    searchParams.set('page', String(params.page));
  }
  if (params?.size !== undefined) {
    searchParams.set('size', String(params.size));
  }

  const endpoint = getUsersApiEndpoint(`/v1/admin/users?${searchParams.toString()}`);
  const token = params?.authToken || getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    throw new Error('Authentification requise pour accéder à la liste des utilisateurs.');
  }
  if (res.status === 403) {
    throw new Error('Accès réservé aux administrateurs de la plateforme.');
  }
  if (!res.ok) {
    throw new Error(`Impossible de récupérer les utilisateurs (HTTP ${res.status})`);
  }

  return await res.json();
}

/**
 * Retrieves a specific user details by ID.
 */

export async function getAdminUserById(id: string, authToken?: string): Promise<UserResponse> {
  const endpoint = getUsersApiEndpoint(`/v1/admin/users/${encodeURIComponent(id)}`);
  const token = authToken || getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    throw new Error('Authentification requise.');
  }
  if (res.status === 403) {
    throw new Error('Accès réservé aux administrateurs.');
  }
  if (!res.ok) {
    throw new Error(`Utilisateur introuvable (HTTP ${res.status})`);
  }

  return await res.json();
}

/**
 * Updates a user profile as administrator.
 */

export async function updateAdminUser(
  id: string,
  payload: AdminUserUpdateRequest,
  authToken?: string
): Promise<UserResponse> {
  const endpoint = getUsersApiEndpoint(`/v1/admin/users/${encodeURIComponent(id)}`);
  const token = authToken || getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.message || `Impossible de mettre à jour l'utilisateur (HTTP ${res.status})`
    );
  }

  return await res.json();
}

/**
 * Unlocks a temporarily locked user account (failed login attempts).
 */

export async function unlockAdminUser(id: string, authToken?: string): Promise<UserResponse> {
  const endpoint = getUsersApiEndpoint(`/v1/admin/users/${encodeURIComponent(id)}/unlock`);
  const token = authToken || getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.message || `Impossible de déverrouiller l'utilisateur (HTTP ${res.status})`
    );
  }

  return await res.json();
}

/**
 * Retrieves detailed administrative profile of a specific partner merchant.
 * Returns partner details and associated store UIDs.
 */

export async function getAdminPartnerById(
  partnerId: string,
  authToken?: string
): Promise<AdminPartnerDetail> {
  const endpoint = getUsersApiEndpoint(`/v1/admin/partners/${encodeURIComponent(partnerId)}`);
  const token = authToken || getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    throw new Error('Authentification requise pour accéder au détail du partenaire.');
  }
  if (res.status === 403) {
    throw new Error('Accès réservé aux administrateurs de la plateforme.');
  }
  if (res.status === 404) {
    throw new Error('Partenaire commerçant introuvable.');
  }
  if (!res.ok) {
    throw new Error(`Erreur lors de la récupération du partenaire (HTTP ${res.status})`);
  }

  const partner: AdminPartnerDetail = await res.json();
  return partner;
}

/**
 * Associates an existing municipal store with a partner merchant.
 */

export async function addStoreToPartner(
  partnerId: string,
  storeUid: string,
  authToken?: string
): Promise<void> {
  const endpoint = getUsersApiEndpoint(
    `/v1/admin/partners/${encodeURIComponent(partnerId)}/stores`
  );
  const token = authToken || getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ storeUid }),
  });

  if (res.status === 401) {
    throw new Error('Authentification requise pour associer un commerce.');
  }
  if (res.status === 403) {
    throw new Error('Accès réservé aux administrateurs de la plateforme.');
  }
  if (!res.ok) {
    throw new Error(`Impossible d'associer le commerce au partenaire (HTTP ${res.status})`);
  }
}

/**
 * Detaches / unlinks a municipal store from a partner merchant account.
 */

export async function removeStoreFromPartner(
  partnerId: string,
  storeUid: string,
  authToken?: string
): Promise<void> {
  const endpoint = getUsersApiEndpoint(
    `/v1/admin/partners/${encodeURIComponent(partnerId)}/stores/${encodeURIComponent(storeUid)}`
  );
  const token = authToken || getAuthToken();
  try {
    const res = await fetchWithTimeout(endpoint, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.status === 401) {
      throw new Error('Authentification requise pour désaffecter un commerce.');
    }
    if (res.status === 403) {
      throw new Error('Accès réservé aux administrateurs de la plateforme.');
    }
  } catch (err: unknown) {
    console.warn(`[API removeStoreFromPartner] Note sur la désaffectation:`, err);
  }
}

export interface AdminPartnerUpdateRequest {
  firstName: string;
  lastName: string;
  birthDate: string; // YYYY-MM-DD
}

/**
 * Updates identity and administrative profile of a partner merchant.
 */

export async function updateAdminPartner(
  partnerId: string,
  payload: AdminPartnerUpdateRequest,
  authToken?: string
): Promise<AdminPartnerDetail> {
  const endpoint = getUsersApiEndpoint(`/v1/admin/partners/${encodeURIComponent(partnerId)}`);
  const token = authToken || getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    throw new Error('Authentification requise pour modifier le partenaire.');
  }
  if (res.status === 403) {
    throw new Error('Accès réservé aux administrateurs de la plateforme.');
  }
  if (res.status === 404) {
    throw new Error('Partenaire commerçant introuvable.');
  }
  if (!res.ok) {
    throw new Error(`Impossible de modifier le compte partenaire (HTTP ${res.status})`);
  }

  const updated: AdminPartnerDetail = await res.json();
  return updated;
}

export async function registerUser(request: UserRegistrationRequest): Promise<UserResponse> {
  const normalizedEmail = request.email.trim().toLowerCase();

  const res = await fetchWithTimeout(getUsersApiEndpoint('/v1/users'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, email: normalizedEmail }),
  });

  if (res.status === 409) {
    throw new Error('Email already in use');
  }

  if (!res.ok) {
    let errorDetail = `Erreur lors de l'inscription (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.detail) errorDetail = errorJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as UserResponse;
}

interface LoginApiResponse {
  token: string;
  tokenType?: string;
  expiresIn?: number;
  userId?: string;
  email?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  clientCode?: string;
  user?: {
    id?: string;
    email?: string;
    role?: string;
    firstName?: string;
    lastName?: string;
    clientCode?: string;
    birthDate?: string;
    pickupLocation?: string;
    licensePlates?: string[];
    createdAt?: string;
    updatedAt?: string;
  };
}

export async function loginUser(credentials: UserLoginRequest): Promise<UserResponse> {
  const normalizedEmail = credentials.email.trim().toLowerCase();

  let res: Response;
  try {
    res = await fetchWithTimeout(getUsersApiEndpoint('/v1/users/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password: credentials.password }),
    });
  } catch {
    throw new Error(
      "Impossible de joindre le serveur d'authentification. Veuillez vérifier que les services sont démarrés."
    );
  }

  if (res.status === 401 || res.status === 404) {
    throw new Error('Identifiants incorrects (email ou mot de passe invalide).');
  }

  if (!res.ok) {
    let errorDetail = `Erreur du serveur (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.detail) errorDetail = errorJson.detail;
    } catch {
      // Ignore JSON parsing error
    }
    throw new Error(errorDetail);
  }

  const authData = (await res.json()) as LoginApiResponse;
  const userObj = authData.user || {};
  const { id: userObjId } = userObj;

  const sessionData: AuthResponse = {
    token: authData.token,
    tokenType: authData.tokenType || 'Bearer',
    expiresIn: authData.expiresIn || 7200000,
    userId: userObjId || authData.userId || '',
    email: userObj.email || authData.email || normalizedEmail,
    role: (userObj.role || authData.role || 'CLIENT') as UserRole,
    firstName: userObj.firstName || authData.firstName || '',
    lastName: userObj.lastName || authData.lastName || '',
    clientCode: userObj.clientCode || authData.clientCode || '',
    birthDate: userObj.birthDate,
    pickupLocation: userObj.pickupLocation,
    licensePlates: userObj.licensePlates,
  };

  // 1. Set the SSR HttpOnly cookie via the dedicated endpoint
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: sessionData.token, expiresIn: sessionData.expiresIn }),
        credentials: 'include',
      });
    } catch (sessionErr) {
      console.warn('Impossible de définir le cookie de session sécurisé:', sessionErr);
    }
  }

  // 2. Update the session in localStorage and notify components
  setAuthSession(sessionData);

  return {
    id: String(sessionData.userId),
    email: sessionData.email,
    role: sessionData.role,
    firstName: sessionData.firstName || 'Utilisateur',
    lastName: sessionData.lastName || '',
    birthDate: userObj.birthDate || '1995-01-01',
    clientCode: sessionData.clientCode || 'CL-00000',
    pickupLocation: userObj.pickupLocation || undefined,
    licensePlates: userObj.licensePlates || [],
    createdAt: userObj.createdAt || new Date().toISOString(),
    updatedAt: userObj.updatedAt || new Date().toISOString(),
  };
}

export async function logoutUser(): Promise<void> {
  const token = getAuthToken();
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
    } catch (err) {
      console.warn('Erreur lors de la déconnexion via endpoint SSR:', err);
    }
  }
  clearAuthSession();
}

/**
 * Retrieves the current authenticated user profile from users-service /v1/users/me.
 */

export async function getCurrentUserProfile(): Promise<UserResponse> {
  const endpoint = getUsersApiEndpoint('/v1/users/me');
  const token = getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Impossible de récupérer le profil utilisateur (${res.status})`);
  }
  return (await res.json()) as UserResponse;
}

/**
 * Updates personal details for the specified user in users-service /v1/users/{userId}.
 */
export interface UserUpdateRequest {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  pickupLocation?: string;
}

export async function updateUserProfile(
  userId: string,
  data: UserUpdateRequest
): Promise<UserResponse> {
  const endpoint = getUsersApiEndpoint(`/v1/users/${userId}`);
  const token = getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let errorDetail = `Erreur lors de la mise à jour du profil (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
    } catch {}
    throw new Error(errorDetail);
  }

  const updatedUser = (await res.json()) as UserResponse;

  // Sync updated user data into auth session
  const currentUser = getAuthUser();
  if (currentUser && currentUser.id === userId) {
    setAuthSession({
      token: token || '',
      tokenType: 'Bearer',
      expiresIn: 7200000,
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      clientCode: updatedUser.clientCode,
      birthDate: updatedUser.birthDate,
      pickupLocation: updatedUser.pickupLocation,
      licensePlates: updatedUser.licensePlates,
    });
  }

  return updatedUser;
}

/**
 * ==============================================================================
 * PRODUCT & CLICK & COLLECT CATALOG APIS
 * ==============================================================================
 */

/**
 * Retrieves the full product catalog of a specific store.
 */

export async function fetchUserVehicles(): Promise<VehicleResponse[]> {
  const endpoint = getUsersApiEndpoint('/v1/users/me/vehicles');
  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    let errorDetail = `Impossible de récupérer les véhicules (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.detail) errorDetail = errorJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as VehicleResponse[];
}

/**
 * Adds a new vehicle license plate to the current user profile.
 */

export async function addVehicle(licensePlate: string): Promise<VehicleResponse> {
  const endpoint = getUsersApiEndpoint('/v1/users/me/vehicles');
  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ licensePlate }),
  });

  if (res.status === 409) {
    throw new Error("Cette plaque d'immatriculation est déjà associée à un compte.");
  }
  if (res.status === 400) {
    let errorDetail = "Le format de la plaque d'immatriculation est invalide.";
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.detail) errorDetail = errorJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }
  if (res.status === 403) {
    throw new Error("Vous n'êtes pas autorisé à gérer les véhicules pour ce compte.");
  }
  if (!res.ok) {
    let errorDetail = `Erreur lors de l'ajout du véhicule (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.detail) errorDetail = errorJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  const createdVehicle = (await res.json()) as VehicleResponse;

  // Synchronize local user session
  const currentUser = getAuthUser();
  if (currentUser) {
    const currentPlates = currentUser.licensePlates || [];
    if (!currentPlates.some((p) => p.toUpperCase() === createdVehicle.licensePlate.toUpperCase())) {
      updateAuthUser({
        licensePlates: [...currentPlates, createdVehicle.licensePlate],
      });
    }
  }

  return createdVehicle;
}

/**
 * Updates an existing license plate for the current user profile.
 */

export async function updateVehicle(oldPlate: string, newPlate: string): Promise<VehicleResponse> {
  const endpoint = getUsersApiEndpoint(`/v1/users/me/vehicles/${encodeURIComponent(oldPlate)}`);
  const res = await fetchWithTimeout(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ licensePlate: newPlate }),
  });

  if (res.status === 409) {
    throw new Error("Cette nouvelle plaque d'immatriculation est déjà enregistrée sur un compte.");
  }
  if (res.status === 400) {
    let errorDetail = "Le nouveau format de la plaque d'immatriculation est invalide.";
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.detail) errorDetail = errorJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }
  if (res.status === 404) {
    throw new Error("Le véhicule à modifier n'a pas été trouvé.");
  }
  if (res.status === 403) {
    throw new Error("Vous n'êtes pas autorisé à modifier ce véhicule.");
  }
  if (!res.ok) {
    let errorDetail = `Erreur lors de la modification du véhicule (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.detail) errorDetail = errorJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  const updatedVehicle = (await res.json()) as VehicleResponse;

  // Synchronize local user session
  const currentUser = getAuthUser();
  if (currentUser) {
    const currentPlates = currentUser.licensePlates || [];
    const updatedPlates = currentPlates.map((p) =>
      p.toUpperCase() === oldPlate.toUpperCase() ? updatedVehicle.licensePlate : p
    );
    updateAuthUser({
      licensePlates: updatedPlates,
    });
  }

  return updatedVehicle;
}

/**
 * Deletes a vehicle license plate from the current user profile.
 */

export async function deleteVehicle(licensePlate: string): Promise<void> {
  const endpoint = getUsersApiEndpoint(`/v1/users/me/vehicles/${encodeURIComponent(licensePlate)}`);
  const res = await fetchWithTimeout(endpoint, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 404) {
    throw new Error("Le véhicule à supprimer n'a pas été trouvé.");
  }
  if (res.status === 403) {
    throw new Error("Vous n'êtes pas autorisé à supprimer ce véhicule.");
  }
  if (!res.ok && res.status !== 204) {
    let errorDetail = `Erreur lors de la suppression du véhicule (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.detail) errorDetail = errorJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  // Synchronize local user session
  const currentUser = getAuthUser();
  if (currentUser) {
    const currentPlates = currentUser.licensePlates || [];
    const updatedPlates = currentPlates.filter(
      (p) => p.toUpperCase() !== licensePlate.toUpperCase()
    );
    updateAuthUser({
      licensePlates: updatedPlates,
    });
  }
}

/**
 * Retrieves the configured loyalty rate for a store (or the default rate 1 € = 1 pt).
 * Publicly accessible for customers and merchants.
 */

export async function identifyCustomerByCardNumber(
  clientCode: string
): Promise<CustomerIdentificationResponse> {
  const normalizedCode = clientCode.trim().toUpperCase();
  const endpoint = getUsersApiEndpoint(
    `/v1/users/loyalty-cards/${encodeURIComponent(normalizedCode)}`
  );
  const token = getAuthToken();

  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    throw new Error('Authentification requise pour identifier un client.');
  }
  if (res.status === 403) {
    throw new Error('Accès réservé aux commerçants partenaires et administrateurs.');
  }
  if (res.status === 404) {
    throw new Error(`Aucun compte client trouvé pour le code fidélité "${normalizedCode}".`);
  }
  if (!res.ok) {
    let detail = `Erreur lors de l'identification du client (${res.status})`;
    try {
      const err = await res.json();
      if (err.message) detail = err.message;
      else if (err.detail) detail = err.detail;
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(detail);
  }

  return (await res.json()) as CustomerIdentificationResponse;
}

export async function getCitizenCardEmailSetting(
  authToken?: string
): Promise<CitizenCardEmailSettingResponse> {
  const endpoint = getUsersApiEndpoint('/v1/admin/settings/citizen-card-email');
  const token = authToken || getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    throw new Error('Authentification requise pour accéder aux paramètres.');
  }
  if (res.status === 403) {
    throw new Error('Accès réservé aux administrateurs de la plateforme.');
  }
  if (!res.ok) {
    throw new Error(`Impossible de récupérer le paramètre d'email (HTTP ${res.status})`);
  }

  const raw = (await res.json()) as Record<string, unknown>;
  const resolvedEmail = String(raw.email || raw.effectiveEmail || raw.defaultEmail || '');
  const resolvedDefault = String(raw.defaultEmail || '');
  const resolvedCustomized = Boolean(raw.isCustomized ?? raw.customized ?? false);
  return {
    email: resolvedEmail,
    defaultEmail: resolvedDefault,
    isCustomized: resolvedCustomized,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : null,
    updatedBy: raw.updatedBy ? String(raw.updatedBy) : null,
    effectiveEmail: resolvedEmail,
    customized: resolvedCustomized,
  };
}

/**
 * Updates the email address for citizen physical card notifications.
 * Restricted to administrators.
 */

export async function updateCitizenCardEmailSetting(
  email: string,
  authToken?: string
): Promise<CitizenCardEmailSettingResponse> {
  const endpoint = getUsersApiEndpoint('/v1/admin/settings/citizen-card-email');
  const token = authToken || getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ email }),
  });

  if (res.status === 401) {
    throw new Error('Authentification requise pour modifier les paramètres.');
  }
  if (res.status === 403) {
    throw new Error('Accès réservé aux administrateurs de la plateforme.');
  }
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    const message = errorBody?.message || `Erreur lors de la mise à jour (HTTP ${res.status})`;
    throw new Error(message);
  }

  const raw = (await res.json()) as Record<string, unknown>;
  const resolvedEmail = String(raw.email || raw.effectiveEmail || raw.defaultEmail || '');
  const resolvedDefault = String(raw.defaultEmail || '');
  const resolvedCustomized = Boolean(raw.isCustomized ?? raw.customized ?? false);
  return {
    email: resolvedEmail,
    defaultEmail: resolvedDefault,
    isCustomized: resolvedCustomized,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : null,
    updatedBy: raw.updatedBy ? String(raw.updatedBy) : null,
    effectiveEmail: resolvedEmail,
    customized: resolvedCustomized,
  };
}
