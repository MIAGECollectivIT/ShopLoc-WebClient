export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const user = context.locals.user;

  if (!user && context.locals.authUnavailable) {
    // Si la clé publique n'a pas pu être récupérée côté serveur SSR,
    // on renvoie un code 503 pour que le client sache qu'il ne s'agit pas d'un rejet de token.
    return new Response(
      JSON.stringify({
        user: null,
        isAuthenticated: null,
        error: 'AUTH_KEY_UNAVAILABLE',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(
    JSON.stringify({
      user,
      isAuthenticated: Boolean(user),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
