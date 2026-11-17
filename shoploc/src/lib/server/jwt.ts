import crypto from 'node:crypto';
import type { UserRole } from '@/types/user';

export interface JwtTokenPayload {
  exp?: number;
  jti?: string;
  userId?: string;
  dbId?: number;
  sub?: string;
  email?: string;
  role?: UserRole | string;
  userRole?: UserRole | string;
  firstName?: string;
  lastName?: string;
  clientCode?: string;
  [key: string]: unknown;
}

export function resolveUsersServiceUrl(): string {
  return (
    (typeof process !== 'undefined' && process.env?.USERS_SERVICE_URL) ||
    (typeof process !== 'undefined' && process.env?.INTERNAL_USERS_SERVICE_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.USERS_SERVICE_URL) ||
    (typeof process !== 'undefined' && process.env?.INTERNAL_API_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.INTERNAL_API_URL) ||
    'http://localhost:8080'
  ).replace(/\/+$/, '');
}

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

export async function getOrFetchPublicKey(): Promise<string | null> {
  if (cachedPublicKeyPem) return cachedPublicKeyPem;

  const envKey =
    process.env.JWT_PUBLIC_KEY ||
    process.env.PUBLIC_JWT_PUBLIC_KEY ||
    (typeof import.meta !== 'undefined' && import.meta.env?.JWT_PUBLIC_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_JWT_PUBLIC_KEY);

  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    try {
      cachedPublicKeyPem = formatPublicKeyPem(envKey);
      return cachedPublicKeyPem;
    } catch (e) {
      console.warn("[Astro SSR] Erreur lors du formatage de la clé JWT d'environnement:", e);
    }
  }

  const usersUrl = resolveUsersServiceUrl();
  try {
    const res = await fetch(`${usersUrl}/v1/auth/public-key`, {
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

export function verifyAndDecodeToken(token: string, publicKeyPem: string): JwtTokenPayload | null {
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
