import type {
  PaymentAuthorizationRequest,
  PaymentAuthorizationResponse,
  UserPaymentTransaction,
} from '@/types/payment';
import type { CreateOrderRequest, OrderResponse } from '@/types/order';
import type {
  OptimizeItineraryRequest,
  OptimizeItineraryResponse,
  TransportMode,
} from '@/types/itinerary';
import type {
  PhysicalSaleRequest,
  PhysicalSaleResponse,
  StoreTurnoverResponse,
} from '@/types/sales';
import type {
  Wallet,
  WalletTransaction,
  WalletReloadRequest,
  WalletDebitRequest,
} from '@/types/wallet';
import { getAuthToken } from '../auth';
import { fetchWithTimeout, getApiEndpoint } from './core';

export async function getStoreTurnover(storeUid: string): Promise<StoreTurnoverResponse> {
  const endpoint = getApiEndpoint(`/v1/sales/stores/${storeUid}/turnover`);
  const token = getAuthToken();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      ...authHeaders,
    },
  });

  if (!res.ok) {
    throw new Error(`Erreur lors de la récupération du chiffre d'affaires (${res.status})`);
  }

  const data: StoreTurnoverResponse = await res.json();
  return data;
}

export async function getUserPaymentTransactions(
  userId: string,
  from?: string,
  to?: string
): Promise<UserPaymentTransaction[]> {
  const queryParams = new URLSearchParams();
  if (from) queryParams.set('from', from);
  if (to) queryParams.set('to', to);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const endpoint = getApiEndpoint(
    `/v1/sales/payments/users/${encodeURIComponent(userId)}/transactions${queryString}`
  );
  const token = getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let errorDetail = `Impossible de récupérer l'historique des paiements (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.error) errorDetail = errorJson.error;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as UserPaymentTransaction[];
}

/**
 * Fetches a customer's loyalty points balance and movement history.
 */

export async function authorizePayment(
  payload: PaymentAuthorizationRequest
): Promise<PaymentAuthorizationResponse> {
  const endpoint = getApiEndpoint('/v1/sales/payments/authorize');
  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorDetail = `Payment authorization failed (HTTP ${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.error) errorDetail = errorJson.error;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as PaymentAuthorizationResponse;
}

/**
 * Records an in-store physical sale checkout for an identified customer and attributes loyalty points.
 * Restricted to authenticated merchants and administrators.
 */

export async function recordPhysicalSale(
  payload: PhysicalSaleRequest
): Promise<PhysicalSaleResponse> {
  const endpoint = getApiEndpoint('/v1/sales/physical');
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorDetail = `L'enregistrement de la vente a échoué (HTTP ${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.error) errorDetail = errorJson.error;
      else if (errorJson.details) {
        errorDetail = Object.values(errorJson.details).join(', ');
      }
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as PhysicalSaleResponse;
}

/**
 * Retrieves a physical sale transaction audit record by reference.
 */

export async function getPhysicalSaleByReference(reference: string): Promise<PhysicalSaleResponse> {
  const endpoint = getApiEndpoint(`/v1/sales/physical/${encodeURIComponent(reference)}`);
  const token = getAuthToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    throw new Error(`Transaction de vente physique introuvable (HTTP ${res.status})`);
  }

  return (await res.json()) as PhysicalSaleResponse;
}

export async function getPaymentByReference(
  reference: string
): Promise<PaymentAuthorizationResponse> {
  const endpoint = getApiEndpoint(`/v1/sales/payments/${encodeURIComponent(reference)}`);
  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Payment transaction not found (HTTP ${res.status})`);
  }

  return (await res.json()) as PaymentAuthorizationResponse;
}

/**
 * Identifies a customer by their 7-character loyalty code or scanned QR code.
 * Restricted to authenticated merchants and administrators.
 * Returns masked customer profile (GDPR compliant).
 */

export async function createOrder(
  payload: CreateOrderRequest,
  token?: string
): Promise<OrderResponse> {
  const authToken = token || getAuthToken();
  const endpoint = getApiEndpoint('/v1/sales/orders');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorDetail = `Order creation failed (HTTP ${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.error) errorDetail = errorJson.error;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as OrderResponse;
}

export async function getOrderByReference(
  reference: string,
  token?: string
): Promise<OrderResponse> {
  const authToken = token || getAuthToken();
  const endpoint = getApiEndpoint(`/v1/sales/orders/${encodeURIComponent(reference)}`);
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    throw new Error(`Order not found (HTTP ${res.status})`);
  }

  return (await res.json()) as OrderResponse;
}

export async function optimizeStoreItinerary(
  request: OptimizeItineraryRequest,
  token?: string
): Promise<OptimizeItineraryResponse> {
  const authToken = token || getAuthToken();
  const endpoint = getApiEndpoint('/v1/stores/itinerary/optimize');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Calcul de tournée impossible (HTTP ${res.status}): ${errorText}`);
  }

  return (await res.json()) as OptimizeItineraryResponse;
}

export async function optimizeOrderItinerary(
  reference: string,
  options?: {
    originLatitude?: number | null;
    originLongitude?: number | null;
    originAddress?: string | null;
    transportMode?: TransportMode;
    departureTime?: string | null;
  },
  token?: string
): Promise<OptimizeItineraryResponse> {
  const authToken = token || getAuthToken();
  const endpoint = getApiEndpoint(`/v1/sales/orders/${encodeURIComponent(reference)}/itinerary`);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(options || {}),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Calcul de tournée de commande impossible (HTTP ${res.status}): ${errorText}`);
  }

  return (await res.json()) as OptimizeItineraryResponse;
}

export async function updateOrderStatus(
  reference: string,
  status: string,
  token?: string
): Promise<OrderResponse> {
  const authToken = token || getAuthToken();
  const endpoint = getApiEndpoint(`/v1/sales/orders/${encodeURIComponent(reference)}/status`);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    let errorDetail = `Failed to update order status (HTTP ${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as OrderResponse;
}

export async function getCustomerOrders(token?: string): Promise<OrderResponse[]> {
  const authToken = token || getAuthToken();
  const endpoint = getApiEndpoint('/v1/sales/orders');
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    throw new Error(`Erreur lors de la récupération des commandes (HTTP ${res.status})`);
  }

  return (await res.json()) as OrderResponse[];
}

export async function downloadOrderReceiptPdf(
  identifier: string,
  token?: string,
  orderReference?: string,
  orderStatus?: string
): Promise<{ blob: Blob; filename: string }> {
  const authToken = token || getAuthToken();
  const endpoint = getApiEndpoint(`/v1/sales/orders/${encodeURIComponent(identifier)}/receipt`);
  const headers: Record<string, string> = {
    Accept: 'application/pdf, application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const isCompleted = orderStatus && orderStatus.toUpperCase() === 'COMPLETED';
    let errorDetail = isCompleted
      ? `Échec du téléchargement de la facture (HTTP ${res.status})`
      : `Échec du téléchargement du bon de retrait (HTTP ${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.message) errorDetail = errJson.message;
      else if (errJson.error) errorDetail = errJson.error;
    } catch {}
    throw new Error(errorDetail);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/pdf')) {
    throw new Error("Le serveur n'a pas renvoyé un fichier PDF valide.");
  }

  const blob = await res.blob();

  // Prefer filename from Content-Disposition header if provided by backend
  let filename = '';
  const disposition = res.headers.get('content-disposition');
  if (disposition) {
    const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, '').trim();
    }
  }

  // Fallback to orderReference if provided, or identifier
  if (!filename) {
    const ref = orderReference || identifier;
    const isCompleted = orderStatus && orderStatus.toUpperCase() === 'COMPLETED';
    filename = isCompleted ? `facture-${ref}.pdf` : `bon-de-retrait-${ref}.pdf`;
  }

  return { blob, filename };
}

export async function resendOrderReceiptEmail(
  identifier: string,
  token?: string
): Promise<{ success: boolean; orderReference: string }> {
  const authToken = token || getAuthToken();
  const endpoint = getApiEndpoint(
    `/v1/sales/orders/${encodeURIComponent(identifier)}/resend-receipt`
  );
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    let errorDetail = `Échec de l'envoi de l'email (HTTP ${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.message) errorDetail = errJson.message;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as { success: boolean; orderReference: string };
}

export async function getWallet(token?: string): Promise<Wallet> {
  const authToken = token || getAuthToken();
  const endpoint = getApiEndpoint('/v1/sales/wallet');
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    let errorDetail = `Impossible de récupérer le solde du porte-monnaie (HTTP ${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.message) errorDetail = errJson.message;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as Wallet;
}

/**
 * Reloads the citizen's wallet with a custom amount between 5.00 € and 100.00 € via bank gateway.
 * Supports automatic client-generated idempotency key to prevent double charge on retries.
 */

export async function reloadWallet(
  amount: number,
  paymentToken = 'tok_visa_4242',
  token?: string,
  idempotencyKey?: string
): Promise<Wallet> {
  const authToken = token || getAuthToken();
  const endpoint = getApiEndpoint('/v1/sales/wallet/reload');
  const effectiveIdempotencyKey =
    idempotencyKey ||
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : undefined);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  if (effectiveIdempotencyKey) {
    headers['X-Idempotency-Key'] = effectiveIdempotencyKey;
  }

  const payload: WalletReloadRequest = {
    amount,
    paymentToken,
    idempotencyKey: effectiveIdempotencyKey,
  };

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorDetail = `Échec du rechargement (HTTP ${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.message) errorDetail = errJson.message;
      else if (errJson.details?.amount) errorDetail = errJson.details.amount;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as Wallet;
}

/**
 * Retrieves the ordered transaction history (newest to oldest) of the citizen's wallet.
 */

export async function getWalletTransactions(token?: string): Promise<WalletTransaction[]> {
  const authToken = token || getAuthToken();
  const endpoint = getApiEndpoint('/v1/sales/wallet/transactions');
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    let errorDetail = `Impossible de récupérer l'historique des transactions (HTTP ${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.message) errorDetail = errJson.message;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as WalletTransaction[];
}

/**
 * Debits the citizen's wallet for a purchase.
 */

export async function debitWallet(request: WalletDebitRequest, token?: string): Promise<Wallet> {
  const authToken = token || getAuthToken();
  const endpoint = getApiEndpoint('/v1/sales/wallet/debit');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    let errorDetail = `Échec du débit du porte-monnaie (HTTP ${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.message) errorDetail = errJson.message;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as Wallet;
}
