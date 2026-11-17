export const prerender = false;

import type { APIRoute } from 'astro';
import { TOKEN_STORAGE_KEY } from '@/lib/auth';
import { resolveUsersServiceUrl } from '@/lib/server/jwt';

export const POST: APIRoute = async ({ request, cookies }) => {
  const token =
    cookies.get(TOKEN_STORAGE_KEY)?.value ||
    request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');

  if (token) {
    const usersUrl = resolveUsersServiceUrl();
    try {
      await fetch(`${usersUrl}/v1/users/logout`, {
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

  // Securely delete the HttpOnly session cookie
  cookies.delete(TOKEN_STORAGE_KEY, {
    path: '/',
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
