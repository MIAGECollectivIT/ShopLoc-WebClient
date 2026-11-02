import * as React from 'react';
import type { AuthResponse, AuthUser, UserRole } from '@/types/user';

export const TOKEN_STORAGE_KEY = 'shoploc_token';
export const USER_STORAGE_KEY = 'shoploc_user';
export const AUTH_CHANGE_EVENT = 'shoploc-auth-change';

/**
 * Decodes base64 payload safely across browser and Node.js environments.
 */
function decodeBase64(base64: string): string {
  const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return window.atob(normalized);
  }
  return Buffer.from(normalized, 'base64').toString('utf-8');
}

/**
 * Checks whether a JWT token is expired by decoding its payload without full verification.
 */
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return true;
    }
    const jsonString = decodeBase64(parts[1]);
    const payload = JSON.parse(jsonString);
    if (!payload.exp) {
      return false;
    }
    // Exp is in seconds; check with 5s clock skew grace
    return payload.exp * 1000 <= Date.now() + 5000;
  } catch {
    return true;
  }
}

/**
 * Decodes the user profile from a valid JWT token payload.
 */
export function parseUserFromToken(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const jsonString = decodeBase64(parts[1]);
    const payload = JSON.parse(jsonString);

    return {
      id: payload.userId || payload.sub,
      email: payload.email || '',
      role: (payload.role || payload.userRole || 'CLIENT') as UserRole,
      firstName: payload.firstName || '',
      lastName: payload.lastName || '',
      clientCode: payload.clientCode,
    };
  } catch {
    return null;
  }
}

/**
 * Retrieves the stored JWT token from localStorage or document cookies (or explicit cookie header in SSR).
 */
export function getAuthToken(cookieHeader?: string): string | null {
  if (cookieHeader) {
    const cookies = cookieHeader.split('; ');
    const match = cookies.find((row) => row.startsWith(`${TOKEN_STORAGE_KEY}=`));
    if (match) {
      const token = decodeURIComponent(match.split('=')[1]);
      if (!isTokenExpired(token)) {
        return token;
      }
    }
    return null;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  // 1. Try localStorage
  let token = localStorage.getItem(TOKEN_STORAGE_KEY);

  // 2. Fallback to document cookie
  if (!token && typeof document !== 'undefined') {
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    const match = cookies.find((row) => row.startsWith(`${TOKEN_STORAGE_KEY}=`));
    if (match) {
      token = decodeURIComponent(match.split('=')[1]);
    }
  }

  if (token) {
    if (isTokenExpired(token)) {
      clearAuthSession();
      return null;
    }
    return token;
  }

  return null;
}

/**
 * Retrieves the currently logged-in user profile from localStorage or derives from token.
 */
export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawUser = localStorage.getItem(USER_STORAGE_KEY);
  if (rawUser) {
    try {
      return JSON.parse(rawUser) as AuthUser;
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }

  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token && !isTokenExpired(token)) {
    const parsed = parseUserFromToken(token);
    if (parsed) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }
  }

  return null;
}

/**
 * Persists an authenticated user session in localStorage and cookies, and notifies subscribers.
 */
export function setAuthSession(auth: AuthResponse): void {
  if (typeof window === 'undefined') {
    return;
  }

  const user: AuthUser = {
    id: auth.userId,
    email: auth.email,
    role: auth.role,
    firstName: auth.firstName,
    lastName: auth.lastName,
    clientCode: auth.clientCode,
    birthDate: auth.birthDate,
    pickupLocation: auth.pickupLocation,
    licensePlates: auth.licensePlates,
  };

  localStorage.setItem(TOKEN_STORAGE_KEY, auth.token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

  if (typeof document !== 'undefined') {
    let maxAgeSeconds = 7200;
    if (typeof auth.expiresIn === 'number' && auth.expiresIn > 0) {
      maxAgeSeconds = auth.expiresIn > 86400 ? Math.floor(auth.expiresIn / 1000) : auth.expiresIn;
    }
    maxAgeSeconds = Math.max(60, maxAgeSeconds);

    document.cookie = `${TOKEN_STORAGE_KEY}=${encodeURIComponent(
      auth.token
    )}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_CHANGE_EVENT, {
      detail: { user, token: auth.token },
    })
  );
}

/**
 * Clears the user session and token, and notifies subscribers.
 */
export function clearAuthSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);

  if (typeof document !== 'undefined') {
    document.cookie = `${TOKEN_STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;
  }

  window.dispatchEvent(
    new CustomEvent(AUTH_CHANGE_EVENT, {
      detail: { user: null, token: null },
    })
  );
}

/**
 * React hook to observe authentication state and hold the user connection dynamically.
 */
export function useAuth() {
  const [token, setToken] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshState = React.useCallback(() => {
    const currentToken = getAuthToken();
    const currentUser = currentToken ? getAuthUser() : null;
    setToken(currentToken);
    setUser(currentUser);
    setIsLoading(false);

    // Verify SSR session consistency when running in browser
    if (currentToken && typeof window !== 'undefined') {
      fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
        credentials: 'include',
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.isAuthenticated === false) {
            // SSR session token was explicitly invalidated or revoked by the server
            clearAuthSession();
          } else if (data && data.user) {
            setUser(data.user);
          }
        })
        .catch(() => {});
    }
  }, []);

  React.useEffect(() => {
    refreshState();

    const handleAuthChange = () => {
      refreshState();
    };

    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [refreshState]);

  return {
    token,
    user,
    role: (user?.role as UserRole | undefined) ?? null,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login: setAuthSession,
    logout: clearAuthSession,
    refresh: refreshState,
  };
}
