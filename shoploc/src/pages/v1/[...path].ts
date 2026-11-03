export const prerender = false;

import type { APIRoute } from 'astro';

export const ALL: APIRoute = async ({ request, params, url }) => {
  const path = params.path || '';
  const targetServiceUrl =
    (typeof process !== 'undefined' && process.env?.INTERNAL_API_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.INTERNAL_API_URL) ||
    (typeof process !== 'undefined' && process.env?.DEV_BACKEND_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.DEV_BACKEND_URL) ||
    'http://localhost:8080';

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
