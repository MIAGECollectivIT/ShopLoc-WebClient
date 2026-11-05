import type { Store, StoreCreateRequest, StoreResponse, PartnerAccount } from '@/types/store';
import type {
  Product,
  ProductCreateRequest,
  ProductUpdateRequest,
  StockUpdateRequest,
} from '@/types/product';
import type {
  UserRegistrationRequest,
  UserLoginRequest,
  UserResponse,
  AuthResponse,
  UserRole,
  VehicleResponse,
} from '@/types/user';
import {
  getAuthToken,
  getAuthUser,
  setAuthSession,
  clearAuthSession,
  updateAuthUser,
} from './auth';

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

/**
 * ==============================================================================
 * PRODUCT & CLICK & COLLECT CATALOG APIS (SLE-58, SLE-119, SLE-120, SLE-121, SLE-125)
 * ==============================================================================
 */

/**
 * Retrieves the full product catalog of a specific store.
 */
export async function getStoreProducts(storeId: number | string): Promise<Product[]> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeId}/products`);
  const res = await fetchWithTimeout(endpoint);
  if (!res.ok) {
    throw new Error(`Impossible de récupérer les produits du magasin (HTTP ${res.status})`);
  }
  return (await res.json()) as Product[];
}

/**
 * Retrieves a single product by storeId and productId.
 */
export async function getProductById(
  storeId: number | string,
  productId: number | string
): Promise<Product> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeId}/products/${productId}`);
  const res = await fetchWithTimeout(endpoint);
  if (!res.ok) {
    throw new Error(`Produit introuvable (HTTP ${res.status})`);
  }
  return (await res.json()) as Product;
}

/**
 * Creates a new product in the store catalogue (JSON or Multipart with S3 image upload).
 */
export async function createProduct(
  storeId: number | string,
  data: ProductCreateRequest,
  imageFile?: File
): Promise<Product> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeId}/products`);
  const token = getAuthToken();

  let body: BodyInit;
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (imageFile) {
    const formData = new FormData();
    const productBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('product', productBlob);
    formData.append('image', imageFile);
    formData.append('file', imageFile);
    body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers,
    body,
  });

  if (!res.ok) {
    let detail = `Erreur lors de la création du produit (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) detail = err.message;
      else if (err.detail) detail = err.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await res.json()) as Product;
}

/**
 * Updates an existing product (JSON or Multipart with S3 image upload).
 */
export async function updateProduct(
  storeId: number | string,
  productId: number | string,
  data: ProductUpdateRequest,
  imageFile?: File
): Promise<Product> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeId}/products/${productId}`);
  const token = getAuthToken();

  let body: BodyInit;
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (imageFile) {
    const formData = new FormData();
    const productBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('product', productBlob);
    formData.append('image', imageFile);
    formData.append('file', imageFile);
    body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'PUT',
    headers,
    body,
  });

  if (!res.ok) {
    let detail = `Erreur lors de la mise à jour du produit (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) detail = err.message;
      else if (err.detail) detail = err.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await res.json()) as Product;
}

/**
 * Uploads or updates a product image via S3 multipart endpoint PATCH /v1/stores/{storeId}/products/{productId}/image (SLE-143 & SLE-144).
 */
export async function updateProductImage(
  storeId: number | string,
  productId: number | string,
  imageFile: File
): Promise<Product> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeId}/products/${productId}/image`);
  const token = getAuthToken();

  const formData = new FormData();
  formData.append('image', imageFile);

  const res = await fetchWithTimeout(endpoint, {
    method: 'PATCH',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    let detail = `Erreur lors de la mise à jour de l'image (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) detail = err.message;
      else if (err.detail) detail = err.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await res.json()) as Product;
}

/**
 * Updates a product image with a direct URL via JSON endpoint PATCH /v1/stores/{storeId}/products/{productId}/image (SLE-143 & SLE-144).
 */
export async function updateProductImageUrl(
  storeId: number | string,
  productId: number | string,
  imageUrl: string
): Promise<Product> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeId}/products/${productId}/image`);
  const token = getAuthToken();

  const res = await fetchWithTimeout(endpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ imageUrl }),
  });

  if (!res.ok) {
    let detail = `Erreur lors de la mise à jour de l'URL de l'image (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) detail = err.message;
      else if (err.detail) detail = err.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await res.json()) as Product;
}

/**
 * Deletes a product from the store catalog.
 */
export async function deleteProduct(
  storeId: number | string,
  productId: number | string
): Promise<void> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeId}/products/${productId}`);
  const token = getAuthToken();

  const res = await fetchWithTimeout(endpoint, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok && res.status !== 204) {
    let detail = `Erreur lors de la suppression du produit (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) detail = err.message;
    } catch {}
    throw new Error(detail);
  }
}

/**
 * Granularly adjusts product inventory stock via PATCH (SLE-121).
 */
export async function updateProductStock(
  storeId: number | string,
  productId: number | string,
  stockUpdate: StockUpdateRequest
): Promise<Product> {
  const payload: Record<string, number> = {};
  if (typeof stockUpdate.quantityDelta === 'number') {
    payload.quantityDelta = stockUpdate.quantityDelta;
  } else if (typeof stockUpdate.delta === 'number') {
    payload.quantityDelta = stockUpdate.delta;
  }
  if (typeof stockUpdate.newQuantity === 'number') {
    payload.newQuantity = stockUpdate.newQuantity;
  }

  const endpoint = getApiEndpoint(`/v1/stores/${storeId}/products/${productId}/stock`);
  const token = getAuthToken();

  const res = await fetchWithTimeout(endpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = `Erreur lors de la mise à jour du stock (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) detail = err.message;
      else if (err.detail) detail = err.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await res.json()) as Product;
}

/**
 * ==============================================================================
 * VEHICLES & LICENSE PLATES APIS (SLE-13)
 * ==============================================================================
 */

/**
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

  // Synchronisation de la session utilisateur locale
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

  // Synchronisation de la session utilisateur locale
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

  // Synchronisation de la session utilisateur locale
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
