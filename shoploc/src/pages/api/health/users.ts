export const prerender = false;

import type { APIRoute } from 'astro';
import { checkUsersServiceStatus } from '@/lib/api';

export const GET: APIRoute = async () => {
  const health = await checkUsersServiceStatus();

  return new Response(JSON.stringify(health, null, 2), {
    status: health.status === 'UP' ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
};
