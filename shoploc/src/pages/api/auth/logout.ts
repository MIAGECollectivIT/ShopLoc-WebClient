export const prerender = false;

import type { APIRoute } from 'astro';
import { TOKEN_STORAGE_KEY } from '@/lib/auth';

const handleLogout: APIRoute = async ({ request, cookies, redirect }) => {
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

  // Securely delete the HttpOnly session cookie
  cookies.delete(TOKEN_STORAGE_KEY, {
    path: '/',
  });

  if (request.method === 'GET') {
    return redirect('/login');
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST = handleLogout;
export const GET = handleLogout;
