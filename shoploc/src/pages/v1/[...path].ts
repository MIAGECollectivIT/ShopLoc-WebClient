export const prerender = false;

import type { APIRoute } from 'astro';

function resolveTargetServiceUrl(path: string): string {
  const cleanPath = path.toLowerCase();

  if (
    cleanPath.startsWith('users') ||
    cleanPath.startsWith('auth') ||
    cleanPath.startsWith('admin') ||
    cleanPath.startsWith('.well-known')
  ) {
    return (
      (typeof process !== 'undefined' && process.env?.USERS_SERVICE_URL) ||
      (typeof process !== 'undefined' && process.env?.INTERNAL_USERS_SERVICE_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.USERS_SERVICE_URL) ||
      (typeof process !== 'undefined' && process.env?.INTERNAL_API_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.INTERNAL_API_URL) ||
      (typeof process !== 'undefined' && process.env?.DEV_BACKEND_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.DEV_BACKEND_URL) ||
      'http://localhost:8081'
    );
  }

  if (cleanPath.startsWith('stores') || cleanPath.startsWith('products')) {
    return (
      (typeof process !== 'undefined' && process.env?.STORE_SERVICE_URL) ||
      (typeof process !== 'undefined' && process.env?.INTERNAL_STORE_SERVICE_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.STORE_SERVICE_URL) ||
      (typeof process !== 'undefined' && process.env?.INTERNAL_API_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.INTERNAL_API_URL) ||
      (typeof process !== 'undefined' && process.env?.DEV_BACKEND_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.DEV_BACKEND_URL) ||
      'http://localhost:8080'
    );
  }

  if (
    cleanPath.startsWith('sales') ||
    cleanPath.startsWith('orders') ||
    cleanPath.startsWith('cart')
  ) {
    return (
      (typeof process !== 'undefined' && process.env?.SALES_SERVICE_URL) ||
      (typeof process !== 'undefined' && process.env?.INTERNAL_SALES_SERVICE_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.SALES_SERVICE_URL) ||
      (typeof process !== 'undefined' && process.env?.INTERNAL_API_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.INTERNAL_API_URL) ||
      (typeof process !== 'undefined' && process.env?.DEV_BACKEND_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.DEV_BACKEND_URL) ||
      'http://localhost:8080'
    );
  }

  if (cleanPath.startsWith('loyalty')) {
    return (
      (typeof process !== 'undefined' && process.env?.LOYALTY_SERVICE_URL) ||
      (typeof process !== 'undefined' && process.env?.INTERNAL_LOYALTY_SERVICE_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.LOYALTY_SERVICE_URL) ||
      (typeof process !== 'undefined' && process.env?.INTERNAL_API_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.INTERNAL_API_URL) ||
      (typeof process !== 'undefined' && process.env?.DEV_BACKEND_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.DEV_BACKEND_URL) ||
      'http://localhost:8080'
    );
  }

  if (cleanPath.startsWith('observability')) {
    return (
      (typeof process !== 'undefined' && process.env?.OBSERVABILITY_SERVICE_URL) ||
      (typeof process !== 'undefined' && process.env?.INTERNAL_OBSERVABILITY_SERVICE_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.OBSERVABILITY_SERVICE_URL) ||
      (typeof process !== 'undefined' && process.env?.INTERNAL_API_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.INTERNAL_API_URL) ||
      (typeof process !== 'undefined' && process.env?.DEV_BACKEND_URL) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.DEV_BACKEND_URL) ||
      'http://localhost:8080'
    );
  }

  return (
    (typeof process !== 'undefined' && process.env?.INTERNAL_API_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.INTERNAL_API_URL) ||
    (typeof process !== 'undefined' && process.env?.DEV_BACKEND_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.DEV_BACKEND_URL) ||
    'http://localhost:8080'
  );
}

export const ALL: APIRoute = async ({ request, params, url, locals }) => {
  const path = params.path || '';
  const targetServiceUrl = resolveTargetServiceUrl(path);
  const destination = `${targetServiceUrl.replace(/\/+$/, '')}/v1/${path}${url.search}`;

  const forwardHeaders = new Headers(request.headers);
  const hopByHopHeaders = [
    'host',
    'connection',
    'keep-alive',
    'transfer-encoding',
    'content-length',
    'expect',
    'te',
    'upgrade',
    'proxy-connection',
  ];
  for (const h of hopByHopHeaders) {
    forwardHeaders.delete(h);
  }
  if (locals.token && !forwardHeaders.has('authorization')) {
    forwardHeaders.set('authorization', `Bearer ${locals.token}`);
  }
  if (locals.user) {
    if (!forwardHeaders.has('x-user-id') && locals.user.id) {
      forwardHeaders.set('x-user-id', locals.user.id);
    }
    if (!forwardHeaders.has('x-user-role') && locals.user.role) {
      forwardHeaders.set('x-user-role', locals.user.role);
    }
    if (!forwardHeaders.has('x-user-email') && locals.user.email) {
      forwardHeaders.set('x-user-email', locals.user.email);
    }
  }

  const cleanPath = path.toLowerCase();
  const isStoreMutation =
    (cleanPath.startsWith('stores') || cleanPath.startsWith('products')) &&
    request.method !== 'GET' &&
    request.method !== 'HEAD';
  const isProtectedUserEndpoint = cleanPath.startsWith('users/me');

  if (
    (isStoreMutation || isProtectedUserEndpoint) &&
    !locals.user &&
    !forwardHeaders.has('authorization')
  ) {
    return new Response(
      JSON.stringify({
        error: 'UNAUTHORIZED',
        message: 'Authentification requise pour accéder à cette ressource',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

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
    const cause =
      error instanceof Error && 'cause' in error ? String((error as { cause: unknown }).cause) : '';
    const detail =
      error instanceof Error
        ? cause
          ? `${error.message} (${cause})`
          : error.message
        : String(error);

    return new Response(
      JSON.stringify({
        error: 'SERVICE_UNAVAILABLE',
        message: `Impossible de contacter le microservice cible (${destination})`,
        detail,
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
