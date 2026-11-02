export const prerender = false;

import type { APIRoute } from 'astro';
import { TOKEN_STORAGE_KEY } from '@/lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { token, expiresIn } = body;

    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ error: 'Jeton JWT manquant ou invalide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const maxAgeSeconds = Math.max(60, Math.floor((expiresIn || 7200000) / 1000));

    cookies.set(TOKEN_STORAGE_KEY, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: maxAgeSeconds,
      secure: process.env.NODE_ENV === 'production',
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
