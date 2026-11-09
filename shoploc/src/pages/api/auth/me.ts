export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const user = context.locals.user;

  if (!user && context.locals.authUnavailable) {
    // If the public key could not be fetched on the SSR server side,
    // return a 503 status so the client knows the token was not rejected.
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

  if (!user && (context.locals.tokenInvalid || context.locals.tokenRevoked)) {
    return new Response(
      JSON.stringify({
        user: null,
        isAuthenticated: false,
        error: context.locals.tokenRevoked ? 'TOKEN_REVOKED' : 'TOKEN_INVALID',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(
    JSON.stringify({
      user,
      isAuthenticated: Boolean(user),
      error: user ? null : 'NO_TOKEN',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
