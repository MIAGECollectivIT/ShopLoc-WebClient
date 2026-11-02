import { defineMiddleware } from 'astro:middleware';
import crypto from 'node:crypto';
import { TOKEN_STORAGE_KEY } from './lib/auth';
import type { UserRole } from './types/user';

function formatPublicKeyPem(rawKey: string): string {
  if (rawKey.includes('-----BEGIN PUBLIC KEY-----')) {
    return rawKey;
  }
  const clean = rawKey.replace(/\s+/g, '');
  const lines = clean.match(/.{1,64}/g)?.join('\n') || clean;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----\n`;
}

let cachedPublicKeyPem: string | null = null;

async function getOrFetchPublicKey(): Promise<string | null> {
  if (cachedPublicKeyPem) return cachedPublicKeyPem;
  const envKey = process.env.JWT_PUBLIC_KEY || process.env.PUBLIC_JWT_PUBLIC_KEY;
  if (envKey) {
    cachedPublicKeyPem = formatPublicKeyPem(envKey);
    return cachedPublicKeyPem;
  }
  const usersUrl =
    process.env.INTERNAL_USERS_SERVICE_URL ||
    process.env.USERS_SERVICE_URL ||
    'http://localhost:8080';
  try {
    const res = await fetch(`${usersUrl.replace(/\/+$/, '')}/v1/auth/public-key`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.publicKey) {
        cachedPublicKeyPem = formatPublicKeyPem(data.publicKey);
        return cachedPublicKeyPem;
      }
    }
  } catch {}
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
      process.env.INTERNAL_USERS_SERVICE_URL ||
      process.env.USERS_SERVICE_URL ||
      'http://localhost:8080';
    try {
      const res = await fetch(`${usersUrl.replace(/\/+$/, '')}/v1/auth/revoked-tokens`, {
        signal: AbortSignal.timeout(2000),
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
    let payload: JwtTokenPayload | null = null;

    if (publicKeyPem) {
      payload = verifyAndDecodeToken(token, publicKeyPem);
    } else {
      console.warn(
        '[Astro SSR] Clé publique JWT indisponible : rejet sécurisé (fail-closed) du jeton.'
      );
      payload = null;
    }

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
      }
    }

    // Jeton invalide, altéré, expiré ou révoqué : suppression du cookie corrompu
    if (tokenCookie) {
      context.cookies.delete(TOKEN_STORAGE_KEY, { path: '/' });
    }
  }

  context.locals.token = null;
  context.locals.user = null;
  return next();
});
