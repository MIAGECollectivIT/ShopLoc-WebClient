import type { Store } from '@/types/store';
import type { UserRegistrationRequest, UserLoginRequest, UserResponse } from '@/types/user';

export const API_TIMEOUT_MS = 10000;

// Fetch wrapper with AbortController timeout enforcement
export async function fetchWithTimeout(
  input: string | URL | Request,
  init?: RequestInit,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
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

export function getApiEndpoint(path: string, serviceUrlEnv?: string): string {
  const base =
    (typeof process !== 'undefined' &&
      (serviceUrlEnv || process.env?.STORE_SERVICE_URL || process.env?.INTERNAL_API_URL)) ||
    'http://localhost:8080';

  return `${base.replace(/\/$/, '')}${path}`;
}

export function getUsersApiEndpoint(path: string): string {
  const base =
    (typeof process !== 'undefined' &&
      (process.env?.USERS_SERVICE_URL ||
        process.env?.STORE_SERVICE_URL ||
        process.env?.INTERNAL_API_URL)) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_USERS_API_URL) ||
    'http://localhost:8080';

  return `${base.replace(/\/$/, '')}${path}`;
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
  try {
    const res = await fetchWithTimeout(getApiEndpoint('/v1/stores'));
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }
    const data: Store[] = await res.json();
    return data;
  } catch {
    // Fallback partner stores for local development when store-service is offline
    return [
      { id: 1, name: 'Boulangerie du Centre', address: '12 Rue de la République' },
      { id: 2, name: 'Épicerie Bio Terroir', address: '5 Place du Marché' },
      { id: 3, name: 'Librairie Les Mots', address: '8 Rue Victor Hugo' },
    ];
  }
}

export async function getStoreById(id: string | number): Promise<Store> {
  const res = await fetchWithTimeout(getApiEndpoint(`/v1/stores/${id}`));
  if (!res.ok) {
    throw new Error(`Store not found (${res.status})`);
  }
  const data: Store = await res.json();
  return data;
}

export async function registerUser(request: UserRegistrationRequest): Promise<UserResponse> {
  // Backend write operations are temporarily locked to prevent unintended database mutations.
  // Uncomment the block below once backend security and integration testing are ready.
  /*
  const useRealBackend =
    (typeof process !== 'undefined' && process.env?.USE_REAL_USERS_API === 'true') ||
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_USE_REAL_USERS_API === 'true');

  if (useRealBackend) {
    const res = await fetchWithTimeout(getUsersApiEndpoint('/v1/users'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (res.status === 409) {
      throw new Error('Email already in use');
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Registration failed with status ${res.status}`);
    }

    return (await res.json()) as UserResponse;
  }
  */

  // Simulated latency for realistic user experience
  await new Promise((resolve) => setTimeout(resolve, 400));

  // Simulated conflict for testing
  const normalizedEmail = request.email.trim().toLowerCase();
  if (
    normalizedEmail === 'existing@test.com' ||
    normalizedEmail === 'camille.martin@collectivit.fr'
  ) {
    throw new Error('Email already in use');
  }

  const generatedCode = `CL-${Math.floor(10000 + Math.random() * 90000)}`;

  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    email: normalizedEmail,
    role: 'CLIENT',
    firstName: request.firstName.trim(),
    lastName: request.lastName.trim(),
    birthDate: request.birthDate,
    clientCode: generatedCode,
    pickupLocation: request.pickupLocation || 'Mairie',
    licensePlates: request.licensePlates ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function loginUser(credentials: UserLoginRequest): Promise<UserResponse> {
  // Backend authentication endpoint is temporarily locked to avoid live network requests.
  // Uncomment the block below once backend authentication and session management are ready.
  /*
  const useRealBackend =
    (typeof process !== 'undefined' && process.env?.USE_REAL_USERS_API === 'true') ||
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_USE_REAL_USERS_API === 'true');

  if (useRealBackend) {
    const res = await fetchWithTimeout(getUsersApiEndpoint('/v1/users/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (res.status === 401 || res.status === 404) {
      throw new Error('Identifiants incorrects (email ou mot de passe invalide).');
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Login failed with status ${res.status}`);
    }

    return (await res.json()) as UserResponse;
  }
  */

  // Simulated latency for realistic user experience
  await new Promise((resolve) => setTimeout(resolve, 400));

  const normalizedEmail = credentials.email.trim().toLowerCase();
  if (normalizedEmail === 'error@test.com' || credentials.password === 'wrongpassword') {
    throw new Error('Identifiants incorrects (email ou mot de passe invalide).');
  }

  return {
    id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    email: normalizedEmail,
    role: 'CLIENT',
    firstName: 'Camille',
    lastName: 'Martin',
    birthDate: '1995-06-15',
    clientCode: 'CL-34821',
    pickupLocation: "Mairie — Hôtel de Ville (Point d'accueil principal)",
    licensePlates: ['AA-123-BB'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
