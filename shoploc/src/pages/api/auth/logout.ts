export const prerender = false;

import type { APIRoute } from 'astro';
import { TOKEN_STORAGE_KEY } from '@/lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token =
    cookies.get(TOKEN_STORAGE_KEY)?.value ||
    request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');

  if (token) {
    const usersUrl =
      (typeof process !== 'undefined' && process.env?.INTERNAL_API_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.INTERNAL_API_URL) ||
      'http://localhost:8080';
    try {
      await fetch(`${usersUrl.replace(/\/+$/, '')}/v1/users/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(3000),
      });
    } catch (err) {
      console.warn('Erreur lors de la révocation du jeton côté users-service:', err);
    }
  }

  // Suppression sécurisée du cookie de session HttpOnly
  cookies.delete(TOKEN_STORAGE_KEY, {
    path: '/',
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
