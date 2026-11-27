import { getAuthToken, clearAuthSession } from '../auth';

export const API_TIMEOUT_MS = 10000;
const CLIENT_GET_CACHE_TTL_MS = 15000;
const CLIENT_GET_CACHE_MAX_ENTRIES = 100;

interface CachedResponseEntry {
  response: Response;
  expiresAt: number;
}

const clientGetCache = new Map<string, CachedResponseEntry>();
const inFlightGetRequests = new Map<string, Promise<Response>>();

function isCacheableGetRequest(urlStr: string, method: string): boolean {
  if (typeof window === 'undefined' || method !== 'GET') return false;
  if (
    urlStr.includes('/auth/') ||
    urlStr.includes('/payments/') ||
    urlStr.includes('/health') ||
    urlStr.includes('/login') ||
    urlStr.includes('/logout')
  ) {
    return false;
  }
  return true;
}

export function clearClientApiCache(): void {
  clientGetCache.clear();
}

// Fetch wrapper with AbortController timeout enforcement, automatic Bearer JWT injection,
// and browser-side GET TTL cache + in-flight request deduplication.
export async function fetchWithTimeout(
  input: string | URL | Request,
  init?: RequestInit,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const headers = new Headers(init?.headers);
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const cacheable = isCacheableGetRequest(urlStr, method);
  const cacheKey = cacheable ? `${token ? token.slice(-16) : 'anon'}:${urlStr}` : '';

  if (cacheable) {
    const cached = clientGetCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.response.clone();
    }
    if (cached) {
      clientGetCache.delete(cacheKey);
    }

    const inFlight = inFlightGetRequests.get(cacheKey);
    if (inFlight) {
      const sharedResponse = await inFlight;
      return sharedResponse.clone();
    }
  } else if (method !== 'GET' && typeof window !== 'undefined') {
    clientGetCache.clear();
  }

  const executeFetch = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        headers,
        signal: controller.signal,
      });
      if (response.status === 401 && token && typeof window !== 'undefined') {
        if (!urlStr.includes('/login')) {
          clearAuthSession();
          clientGetCache.clear();
        }
      } else if (cacheable && response.ok) {
        if (clientGetCache.size >= CLIENT_GET_CACHE_MAX_ENTRIES) {
          const oldestKey = clientGetCache.keys().next().value;
          if (oldestKey !== undefined) {
            clientGetCache.delete(oldestKey);
          }
        }
        clientGetCache.set(cacheKey, {
          response: response.clone(),
          expiresAt: Date.now() + CLIENT_GET_CACHE_TTL_MS,
        });
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
  };

  if (!cacheable) {
    return executeFetch();
  }

  const requestPromise = executeFetch().finally(() => {
    inFlightGetRequests.delete(cacheKey);
  });
  inFlightGetRequests.set(cacheKey, requestPromise);

  const response = await requestPromise;
  return response.clone();
}

export function getApiEndpoint(path: string, _serviceUrl?: string): string {
  const cleanPath = path.toLowerCase().replace(/^\/+/, '').replace(/^v1\//, '');

  let serviceBase: string | undefined;
  if (
    cleanPath.startsWith('users') ||
    cleanPath.startsWith('auth') ||
    cleanPath.startsWith('admin') ||
    cleanPath.startsWith('.well-known')
  ) {
    serviceBase =
      (typeof process !== 'undefined' && process.env?.USERS_SERVICE_URL) ||
      (typeof process !== 'undefined' && process.env?.INTERNAL_USERS_SERVICE_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.USERS_SERVICE_URL);
  } else if (cleanPath.startsWith('stores') || cleanPath.startsWith('products')) {
    serviceBase =
      (typeof process !== 'undefined' && process.env?.STORE_SERVICE_URL) ||
      (typeof process !== 'undefined' && process.env?.INTERNAL_STORE_SERVICE_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.STORE_SERVICE_URL);
  } else if (
    cleanPath.startsWith('sales') ||
    cleanPath.startsWith('orders') ||
    cleanPath.startsWith('cart')
  ) {
    serviceBase =
      (typeof process !== 'undefined' && process.env?.SALES_SERVICE_URL) ||
      (typeof process !== 'undefined' && process.env?.INTERNAL_SALES_SERVICE_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.SALES_SERVICE_URL);
  } else if (cleanPath.startsWith('loyalty')) {
    serviceBase =
      (typeof process !== 'undefined' && process.env?.LOYALTY_SERVICE_URL) ||
      (typeof process !== 'undefined' && process.env?.INTERNAL_LOYALTY_SERVICE_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.LOYALTY_SERVICE_URL);
  } else if (cleanPath.startsWith('observability')) {
    serviceBase =
      (typeof process !== 'undefined' && process.env?.OBSERVABILITY_SERVICE_URL) ||
      (typeof process !== 'undefined' && process.env?.INTERNAL_OBSERVABILITY_SERVICE_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.OBSERVABILITY_SERVICE_URL);
  }

  const base =
    typeof window !== 'undefined'
      ? ''
      : serviceBase ||
        (typeof process !== 'undefined' && process.env?.INTERNAL_API_URL) ||
        (typeof import.meta !== 'undefined' && import.meta.env?.INTERNAL_API_URL) ||
        'http://localhost:8080';

  return `${base.replace(/\/$/, '')}${path}`;
}

export function getUsersApiEndpoint(path: string): string {
  const base =
    typeof window !== 'undefined'
      ? ''
      : (typeof process !== 'undefined' && process.env?.USERS_SERVICE_URL) ||
        (typeof process !== 'undefined' && process.env?.INTERNAL_USERS_SERVICE_URL) ||
        (typeof import.meta !== 'undefined' && import.meta.env?.USERS_SERVICE_URL) ||
        (typeof process !== 'undefined' && process.env?.INTERNAL_API_URL) ||
        (typeof import.meta !== 'undefined' && import.meta.env?.INTERNAL_API_URL) ||
        (typeof process !== 'undefined' && process.env?.DEV_BACKEND_URL) ||
        (typeof import.meta !== 'undefined' && import.meta.env?.DEV_BACKEND_URL) ||
        'http://localhost:8081';

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

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Retrieves the citizen's real-time wallet balance.
 */
