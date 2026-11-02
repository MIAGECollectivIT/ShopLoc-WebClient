export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const user = context.locals.user;
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
