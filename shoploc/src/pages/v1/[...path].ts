export const prerender = false;

import type { APIRoute } from 'astro';

export const ALL: APIRoute = async ({ request, params, url }) => {
  const path = params.path || '';
  const isUsersRoute =
    path.startsWith('users') || path.startsWith('auth') || path.startsWith('.well-known');

  const usersServiceUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.USERS_SERVICE_URL) ||
    process.env.USERS_SERVICE_URL ||
    'http://localhost:8081';

  const defaultBackendUrl =
    (typeof import.meta !== 'undefined' && import.meta.env?.INTERNAL_API_URL) ||
    process.env.INTERNAL_API_URL ||
    process.env.DEV_BACKEND_URL ||
    'http://localhost:8080';

  const targetServiceUrl = isUsersRoute ? usersServiceUrl : defaultBackendUrl;

  const destination = `${targetServiceUrl.replace(/\/+$/, '')}/v1/${path}${url.search}`;

  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.delete('host');

  const fetchOptions: RequestInit = {
    method: request.method,
    headers: forwardHeaders,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const bodyBuffer = await request.arrayBuffer();
    if (bodyBuffer.byteLength > 0) {
      fetchOptions.body = bodyBuffer;
    }
  }

  try {
    const response = await fetch(destination, fetchOptions);
    const responseHeaders = new Headers(response.headers);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({
        error: 'SERVICE_UNAVAILABLE',
        message: `Impossible de contacter le microservice cible (${destination})`,
        detail: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
