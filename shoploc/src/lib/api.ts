import type { Store, StoreCreateRequest, StoreResponse, PartnerAccount } from '@/types/store';
import type {
  UserRegistrationRequest,
  UserLoginRequest,
  UserResponse,
  AuthResponse,
  UserRole,
} from '@/types/user';
import { getAuthToken, getAuthUser, setAuthSession, clearAuthSession } from './auth';

export const API_TIMEOUT_MS = 10000;

// Fetch wrapper with AbortController timeout enforcement and automatic Bearer JWT injection
export async function fetchWithTimeout(
  input: string | URL | Request,
  init?: RequestInit,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const headers = new Headers(init?.headers);
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(input, {
      ...init,
      headers,
      signal: controller.signal,
    });
    if (response.status === 401 && token && typeof window !== 'undefined') {
      const urlStr =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!urlStr.includes('/login')) {
        clearAuthSession();
      }
    }
    return response;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`La requête a expiré après ${timeoutMs / 1000} secondes.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function getApiEndpoint(path: string, _serviceUrl?: string): string {
  const base =
    typeof window !== 'undefined'
      ? ''
      : (typeof process !== 'undefined' && process.env?.INTERNAL_API_URL) ||
        (typeof import.meta !== 'undefined' && import.meta.env?.INTERNAL_API_URL) ||
        'http://localhost:8080';

  return `${base.replace(/\/$/, '')}${path}`;
}

export function getUsersApiEndpoint(path: string): string {
  return getApiEndpoint(path);
}

export interface ServiceHealthResponse {
  status: 'UP' | 'DOWN';
  service: string;
  statusCode?: number;
  details?: unknown;
  error?: string;
  timestamp: string;
}

// Queries the backend Users Service status without mutating any state
export async function checkUsersServiceStatus(): Promise<ServiceHealthResponse> {
  const endpoint = getUsersApiEndpoint('/v1/users/status');
  try {
    const res = await fetchWithTimeout(endpoint, {}, 5000);
    if (!res.ok) {
      return {
        status: 'DOWN',
        service: 'users-service',
        statusCode: res.status,
        error: `Users service responded with HTTP status ${res.status}`,
        timestamp: new Date().toISOString(),
      };
    }
    const data = await res.json();
    return {
      status: 'UP',
      service: 'users-service',
      statusCode: res.status,
      details: data,
      timestamp: new Date().toISOString(),
    };
  } catch (err: unknown) {
    return {
      status: 'DOWN',
      service: 'users-service',
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    };
  }
}

export async function getStores(): Promise<Store[]> {
  const res = await fetchWithTimeout(getApiEndpoint('/v1/stores'));
  if (!res.ok) {
    throw new Error(`Erreur lors de la récupération des commerces (HTTP ${res.status})`);
  }
  const data: Store[] = await res.json();
  return data;
}

export async function getStoreById(id: string | number): Promise<Store> {
  const res = await fetchWithTimeout(getApiEndpoint(`/v1/stores/${id}`));
  if (!res.ok) {
    throw new Error(`Commerce introuvable (HTTP ${res.status})`);
  }
  const data: Store = await res.json();
  return data;
}

/**
 * Retrieves registered partner accounts from users-service (SLE-87).
 * Filters across name, company name, and email.
 */
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
 * Dispatches a store creation request to store-service /v1/stores (SLE-69, SLE-85).
 */
export async function createStore(payload: StoreCreateRequest): Promise<StoreResponse> {
  const endpoint = getApiEndpoint('/v1/stores');
  const token = getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorDetail = `Erreur lors de la création du commerce (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.error) errorDetail = errorJson.error;
    } catch {
      // Ignorer l'erreur de parsing JSON
    }
    throw new Error(errorDetail);
  }

  const data: StoreResponse = await res.json();
  return data;
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
      // Ignorer l'erreur de parsing JSON
    }
    throw new Error(errorDetail);
  }

  const authData = (await res.json()) as LoginApiResponse;
  const userObj = authData.user || {};

  const sessionData: AuthResponse = {
    token: authData.token,
    tokenType: authData.tokenType || 'Bearer',
    expiresIn: authData.expiresIn || 7200000,
    userId: userObj.id || authData.userId || '',
    email: userObj.email || authData.email || normalizedEmail,
    role: (userObj.role || authData.role || 'CLIENT') as UserRole,
    firstName: userObj.firstName || authData.firstName || '',
    lastName: userObj.lastName || authData.lastName || '',
    clientCode: userObj.clientCode || authData.clientCode || '',
    birthDate: userObj.birthDate,
    pickupLocation: userObj.pickupLocation,
    licensePlates: userObj.licensePlates,
  };

  // 1. Définir le cookie HttpOnly côté SSR via l'endpoint dédié
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

  // 2. Mettre à jour la session dans localStorage et notifier les composants
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
