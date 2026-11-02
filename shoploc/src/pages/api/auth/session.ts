export const prerender = false;

import type { APIRoute } from 'astro';
import { TOKEN_STORAGE_KEY } from '@/lib/auth';

export const POST: APIRoute = async ({ request, cookies, url }) => {
  try {
    const body = await request.json();
    const { token, expiresIn } = body;

    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ error: 'Jeton JWT manquant ou invalide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let maxAgeSeconds = 7200;
    if (typeof expiresIn === 'number' && expiresIn > 0) {
      maxAgeSeconds = expiresIn > 86400 ? Math.floor(expiresIn / 1000) : expiresIn;
    }
    maxAgeSeconds = Math.max(60, maxAgeSeconds);

    const isHttps =
      url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';

    cookies.set(TOKEN_STORAGE_KEY, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: maxAgeSeconds,
      secure: isHttps,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur interne' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
