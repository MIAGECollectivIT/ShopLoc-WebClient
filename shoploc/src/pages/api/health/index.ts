export const prerender = false;

import type { APIRoute } from 'astro';
import { checkUsersServiceStatus } from '@/lib/api';

export const GET: APIRoute = async () => {
  const usersHealth = await checkUsersServiceStatus();
  const isHealthy = usersHealth.status === 'UP';

  const body = {
    status: isHealthy ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    services: {
      frontend: { status: 'UP' },
      users: usersHealth,
    },
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: isHealthy ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
};
