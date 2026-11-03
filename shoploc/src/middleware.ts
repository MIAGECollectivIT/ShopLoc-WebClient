import { defineMiddleware } from 'astro:middleware';
import crypto from 'node:crypto';
import { TOKEN_STORAGE_KEY } from './lib/auth';
import type { UserRole } from './types/user';

function formatPublicKeyPem(rawKey: string): string {
  const unquoted = rawKey.replace(/^["']|["']$/g, '').trim();
  if (unquoted.includes('-----BEGIN PUBLIC KEY-----')) {
    return unquoted.replace(/\\n/g, '\n');
  }
  const clean = unquoted.replace(/\\n/g, '').replace(/\s+/g, '');
  const lines = clean.match(/.{1,64}/g)?.join('\n') || clean;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----\n`;
}

let cachedPublicKeyPem: string | null = null;

async function getOrFetchPublicKey(): Promise<string | null> {
  if (cachedPublicKeyPem) return cachedPublicKeyPem;
  const envKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.JWT_PUBLIC_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_JWT_PUBLIC_KEY) ||
    process.env.JWT_PUBLIC_KEY ||
    process.env.PUBLIC_JWT_PUBLIC_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    try {
      cachedPublicKeyPem = formatPublicKeyPem(envKey);
      return cachedPublicKeyPem;
    } catch (e) {
      console.warn("[Astro SSR] Erreur lors du formatage de la clé JWT d'environnement:", e);
    }
  }
  const usersUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.INTERNAL_USERS_SERVICE_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.USERS_SERVICE_URL) ||
    process.env.INTERNAL_USERS_SERVICE_URL ||
    process.env.USERS_SERVICE_URL ||
    'http://localhost:8080';
  try {
    const res = await fetch(`${usersUrl.replace(/\/+$/, '')}/v1/auth/public-key`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (
        data.publicKey &&
        typeof data.publicKey === 'string' &&
        data.publicKey.trim().length > 0
      ) {
        cachedPublicKeyPem = formatPublicKeyPem(data.publicKey);
        return cachedPublicKeyPem;
      }
    } else {
      console.warn(
        `[Astro SSR] Échec de récupération de la clé publique JWT (HTTP ${res.status}) depuis ${usersUrl}`
      );
    }
  } catch (err) {
    console.warn(
      `[Astro SSR] Impossible de joindre users-service sur ${usersUrl} pour récupérer la clé publique:`,
      err
    );
  }
  return null;
}

let cachedRevokedJtis: Set<string> = new Set();
let lastRevocationFetch = 0;

async function isTokenRevoked(jti?: string): Promise<boolean> {
  if (!jti) return false;
  const now = Date.now();
  if (now - lastRevocationFetch > 15000) {
    lastRevocationFetch = now;
    const usersUrl =
      (typeof import.meta !== 'undefined' && import.meta.env?.INTERNAL_USERS_SERVICE_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.USERS_SERVICE_URL) ||
      process.env.INTERNAL_USERS_SERVICE_URL ||
      process.env.USERS_SERVICE_URL ||
      'http://localhost:8080';
    try {
      const res = await fetch(`${usersUrl.replace(/\/+$/, '')}/v1/auth/revoked-tokens`, {
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

interface JwtTokenPayload {
  exp?: number;
  jti?: string;
  userId?: string;
  sub?: string;
  email?: string;
  role?: UserRole | string;
  userRole?: UserRole | string;
  firstName?: string;
  lastName?: string;
  clientCode?: string;
  [key: string]: unknown;
}

function verifyAndDecodeToken(token: string, publicKeyPem: string): JwtTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const data = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(signatureB64, 'base64url');

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(data);
    const isValid = verifier.verify(publicKeyPem, signature);
    if (!isValid) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
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
      // Clé publique temporairement indisponible : fail-closed pour cette requête,
      // mais on préserve le cookie du client pour ne pas détruire sa session
      context.locals.authUnavailable = true;
      context.locals.token = null;
      context.locals.user = null;
      return next();
    }

    const payload = verifyAndDecodeToken(token, publicKeyPem);

    if (payload) {
      const revoked = await isTokenRevoked(payload.jti);
      if (!revoked) {
        context.locals.token = token;
        context.locals.user = {
          id: payload.userId || payload.sub || '',
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

        return next();
      } else {
        context.locals.tokenRevoked = true;
      }
    } else {
      context.locals.tokenInvalid = true;
    }

    // Le jeton a été vérifié avec une clé valide et est explicitement invalide, expiré ou révoqué
    if (tokenCookie) {
      context.cookies.delete(TOKEN_STORAGE_KEY, { path: '/' });
    }
  }

  context.locals.token = null;
  context.locals.user = null;
  return next();
});
