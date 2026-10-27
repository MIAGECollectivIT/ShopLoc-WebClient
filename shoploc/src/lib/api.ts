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
