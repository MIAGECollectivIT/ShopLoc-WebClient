import { defineMiddleware } from 'astro:middleware';
import { TOKEN_STORAGE_KEY } from './lib/auth';
import {
  getOrFetchPublicKey,
  resolveUsersServiceUrl,
  verifyAndDecodeToken,
} from './lib/server/jwt';
import type { UserRole } from './types/user';

let cachedRevokedJtis: Set<string> = new Set();
let lastRevocationFetch = 0;

async function isTokenRevoked(jti?: string): Promise<boolean> {
  if (!jti) return false;
  const now = Date.now();
  if (now - lastRevocationFetch > 15000) {
    lastRevocationFetch = now;
    const usersUrl = resolveUsersServiceUrl();
    try {
      const res = await fetch(`${usersUrl}/v1/auth/revoked-tokens`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          cachedRevokedJtis = new Set(list);
        }
      }
    } catch {}
  }
  return cachedRevokedJtis.has(jti);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const authHeader =
    context.request.headers.get('Authorization') || context.request.headers.get('authorization');
  let tokenFromHeader: string | null = null;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    tokenFromHeader = authHeader.substring(7).trim();
  }

  const tokenCookie = context.cookies.get(TOKEN_STORAGE_KEY)?.value;
  const token = tokenCookie || tokenFromHeader;

  if (token) {
    const publicKeyPem = await getOrFetchPublicKey();

    if (!publicKeyPem) {
      // Public key temporarily unavailable: fail-closed for this request,
      // but preserve the client cookie to avoid destroying their session
      context.locals.authUnavailable = true;
      context.locals.token = null;
      context.locals.user = null;
    } else {
      const payload = verifyAndDecodeToken(token, publicKeyPem);

      if (payload) {
        const revoked = await isTokenRevoked(payload.jti);
        if (!revoked) {
          context.locals.token = token;
          let parsedDbId: number | undefined;
          if (typeof payload.dbId === 'number') {
            parsedDbId = payload.dbId;
          } else if (payload.dbId && !Number.isNaN(Number(payload.dbId))) {
            parsedDbId = Number(payload.dbId);
          }

          context.locals.user = {
            id: payload.userId || payload.sub || '',
            dbId: parsedDbId,
            email: payload.email || '',
            role: (payload.role || payload.userRole || 'CLIENT') as UserRole,
            firstName: payload.firstName || '',
            lastName: payload.lastName || '',
            clientCode: payload.clientCode,
          };

          if (!tokenCookie && token) {
            const isHttps =
              context.url.protocol === 'https:' ||
              context.request.headers.get('x-forwarded-proto') === 'https';
            const maxAgeSeconds = payload.exp
              ? Math.max(60, Math.floor(payload.exp - Date.now() / 1000))
              : 7200;

            context.cookies.set(TOKEN_STORAGE_KEY, token, {
              path: '/',
              httpOnly: true,
              sameSite: 'lax',
              maxAge: maxAgeSeconds,
              secure: isHttps,
            });
          }
        } else {
          context.locals.tokenRevoked = true;
          context.locals.token = null;
          context.locals.user = null;
        }
      } else {
        context.locals.tokenInvalid = true;
        context.locals.token = null;
        context.locals.user = null;
      }

      // The token was checked with a valid key and is explicitly invalid, expired, or revoked
      if (!context.locals.user && tokenCookie) {
        context.cookies.delete(TOKEN_STORAGE_KEY, { path: '/' });
      }
    }
  } else {
    context.locals.token = null;
    context.locals.user = null;
  }

  const pathname = context.url.pathname;

  // Explicit logout or logout query parameter: immediately purge server cookie
  if (context.url.searchParams.has('logout') || pathname === '/logout') {
    context.cookies.delete(TOKEN_STORAGE_KEY, { path: '/' });
    context.locals.user = null;
    context.locals.token = null;
    if (pathname === '/logout') {
      return context.redirect('/login');
    }
  }

  // 1. Protect pages reserved for authenticated users (SSR)
  if (
    pathname.startsWith('/profile') ||
    pathname.startsWith('/wallet') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/checkout')
  ) {
    if (!context.locals.user) {
      return context.redirect('/login');
    }
  }

  // 2. Protect store cashier scanner route (MERCHANT / ADMIN)
  if (/^\/stores\/[^/]+\/scan(?:\/|$)/.test(pathname)) {
    if (!context.locals.user) {
      return context.redirect('/login');
    }
    const role = context.locals.user.role;
    if (role !== 'MERCHANT' && role !== 'ADMIN') {
      return context.redirect('/stores');
    }
  }

  // 2. Protect store creation route (ADMIN only)
  if (pathname.startsWith('/stores/new')) {
    if (!context.locals.user) {
      return context.redirect('/login');
    }
    const role = context.locals.user.role;
    if (role !== 'ADMIN') {
      return context.redirect('/stores');
    }
  }

  // 3. Protect merchant space routes (MERCHANT / ADMIN)
  if (pathname.startsWith('/stores/my-stores')) {
    if (!context.locals.user) {
      return context.redirect('/login');
    }
    const role = context.locals.user.role;
    if (role !== 'MERCHANT' && role !== 'ADMIN') {
      return context.redirect('/stores');
    }
  }

  // 3. Protect administrative routes (ADMIN only)
  if (pathname.startsWith('/admin')) {
    if (!context.locals.user) {
      return context.redirect('/login');
    }
    const role = context.locals.user.role;
    if (role !== 'ADMIN') {
      return context.redirect('/');
    }
  }

  // 4. Automatically redirect to profile if already authenticated when visiting auth pages
  if ((pathname === '/login' || pathname === '/register') && context.locals.user) {
    if (context.url.searchParams.has('logout') || context.url.searchParams.has('force')) {
      context.cookies.delete(TOKEN_STORAGE_KEY, { path: '/' });
      context.locals.user = null;
      context.locals.token = null;
    } else {
      return context.redirect('/profile');
    }
  }

  return next();
});
