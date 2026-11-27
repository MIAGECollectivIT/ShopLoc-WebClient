import type {
  MerchantLoyaltyRate,
  MerchantLoyaltyRateRequest,
  ParkingSessionAcknowledgment,
  TransitTicketAcknowledgment,
  UserActivityEvaluation,
  UserPointsBalanceResponse,
  UserVfpStatus,
  UserVfpProgress,
  VfpDailyEligibility,
} from '@/types/loyalty';
import type {
  LoyaltyGift,
  GiftCreateRequest,
  GiftUpdateRequest,
  PhysicalGiftRedemptionRequest,
  PhysicalGiftRedemptionResponse,
} from '@/types/gift';
import { getAuthToken } from '../auth';
import { fetchWithTimeout, getApiEndpoint } from './core';

const PARKING_ERROR_MESSAGES: Record<number, string> = {
  400: "Plaque d'immatriculation invalide ou non enregistrée sur votre profil.",
  401: 'Vous devez être connecté pour activer votre stationnement gratuit.',
  403: 'Le stationnement gratuit de 20 minutes est réservé aux détenteurs du statut VFP actif.',
  409: 'Vous avez déjà utilisé votre session de stationnement gratuit aujourd’hui.',
  502: 'Le service de stationnement est temporairement indisponible. Veuillez réessayer.',
};

export async function getStoreLoyaltyRate(storeUid: string): Promise<MerchantLoyaltyRate> {
  const endpoint = getApiEndpoint(`/v1/loyalty/merchants/${storeUid}/rates`);
  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (res.status === 404 || res.status === 400) {
    return {
      storeUid,
      euroAmount: 1,
      pointsReward: 1,
    };
  }

  if (!res.ok) {
    throw new Error(`Impossible de récupérer le barème de fidélité (${res.status})`);
  }

  return (await res.json()) as MerchantLoyaltyRate;
}

/**
 * Configures or updates a store's loyalty rate.
 * Restricted to the store's merchant owner or administrators.
 */

export async function updateStoreLoyaltyRate(
  storeUid: string,
  data: MerchantLoyaltyRateRequest
): Promise<MerchantLoyaltyRate> {
  const endpoint = getApiEndpoint(`/v1/loyalty/merchants/${storeUid}/rates`);
  const token = getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) {
    throw new Error('Vous devez être connecté pour modifier le barème de fidélité.');
  }
  if (res.status === 403) {
    throw new Error(
      'Accès refusé : vous devez être le commerçant propriétaire de cet établissement pour modifier son barème.'
    );
  }
  if (res.status === 404) {
    throw new Error("Le commerce spécifié n'existe pas ou est introuvable.");
  }
  if (!res.ok) {
    let errorDetail = `Erreur lors de l'enregistrement du barème (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.detail) errorDetail = errorJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as MerchantLoyaltyRate;
}

/**
 * Retrieves the global public catalog of active loyalty gifts with optional filters.
 */

export async function getPublicGifts(params?: {
  storeUid?: string;
  category?: string;
}): Promise<LoyaltyGift[]> {
  const searchParams = new URLSearchParams();
  if (params?.storeUid && params.storeUid !== 'ALL') {
    searchParams.set('storeUid', params.storeUid);
  }
  if (params?.category && params.category !== 'ALL') {
    searchParams.set('category', params.category);
  }
  const queryString = searchParams.toString();
  const endpoint = getApiEndpoint(`/v1/loyalty/gifts${queryString ? `?${queryString}` : ''}`);

  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Impossible de récupérer le catalogue des cadeaux (${res.status})`);
  }

  return (await res.json()) as LoyaltyGift[];
}

/**
 * Retrieves the list of loyalty gifts for a store.
 * By default returns active gifts. Set includeInactive to true to retrieve all gifts (for merchants/admins).
 */

export async function getStoreGifts(
  storeUid: string,
  includeInactive: boolean = false
): Promise<LoyaltyGift[]> {
  const query = includeInactive ? '?includeInactive=true' : '';
  const endpoint = getApiEndpoint(`/v1/loyalty/stores/${storeUid}/gifts${query}`);
  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Impossible de récupérer les articles cadeaux (${res.status})`);
  }

  return (await res.json()) as LoyaltyGift[];
}

/**
 * Retrieves a single loyalty gift item.
 */

export async function getStoreGiftById(storeUid: string, giftUid: string): Promise<LoyaltyGift> {
  const endpoint = getApiEndpoint(`/v1/loyalty/stores/${storeUid}/gifts/${giftUid}`);
  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (res.status === 404) {
    throw new Error("L'article cadeau demandé n'existe pas.");
  }
  if (!res.ok) {
    throw new Error(`Impossible de récupérer l'article cadeau (${res.status})`);
  }

  return (await res.json()) as LoyaltyGift;
}

/**
 * Creates a new gift in the store's loyalty catalog (JSON or Multipart with S3 image upload).
 */

export async function createGift(
  storeUid: string,
  data: GiftCreateRequest,
  imageFile?: File
): Promise<LoyaltyGift> {
  const endpoint = getApiEndpoint(`/v1/loyalty/stores/${storeUid}/gifts`);
  const token = getAuthToken();

  let body: BodyInit;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (imageFile) {
    const formData = new FormData();
    const giftBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('gift', giftBlob, 'gift.json');
    formData.append('image', imageFile, imageFile.name);
    body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers,
    body,
  });

  if (res.status === 401) {
    throw new Error('Vous devez être connecté pour ajouter un article cadeau.');
  }
  if (res.status === 403) {
    throw new Error(
      "Accès refusé : vous n'avez pas la permission d'ajouter un cadeau à ce commerce."
    );
  }
  if (!res.ok) {
    let errorDetail = `Erreur lors de la création du cadeau (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.error) errorDetail = errorJson.error;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as LoyaltyGift;
}

/**
 * Updates an existing gift item (JSON or Multipart with S3 image upload).
 */

export async function updateGift(
  storeUid: string,
  giftUid: string,
  data: GiftUpdateRequest,
  imageFile?: File
): Promise<LoyaltyGift> {
  const endpoint = getApiEndpoint(`/v1/loyalty/stores/${storeUid}/gifts/${giftUid}`);
  const token = getAuthToken();

  let body: BodyInit;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (imageFile) {
    const formData = new FormData();
    const giftBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('gift', giftBlob, 'gift.json');
    formData.append('image', imageFile, imageFile.name);
    body = formData;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }

  const res = await fetchWithTimeout(endpoint, {
    method: 'PUT',
    headers,
    body,
  });

  if (res.status === 401) {
    throw new Error('Vous devez être connecté pour modifier cet article cadeau.');
  }
  if (res.status === 403) {
    throw new Error("Accès refusé : vous n'êtes pas autorisé à modifier cet article.");
  }
  if (res.status === 404) {
    throw new Error("L'article cadeau spécifié n'existe pas.");
  }
  if (!res.ok) {
    let errorDetail = `Erreur lors de la mise à jour du cadeau (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as LoyaltyGift;
}

/**
 * Adjusts the dedicated stock of a gift item (+/- delta).
 */

export async function adjustGiftStock(
  storeUid: string,
  giftUid: string,
  delta: number
): Promise<LoyaltyGift> {
  const endpoint = getApiEndpoint(`/v1/loyalty/stores/${storeUid}/gifts/${giftUid}/stock`);
  const token = getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ delta }),
  });

  if (res.status === 401) {
    throw new Error('Vous devez être connecté pour ajuster le stock.');
  }
  if (res.status === 403) {
    throw new Error("Accès refusé : vous n'êtes pas autorisé à ajuster le stock de ce cadeau.");
  }
  if (!res.ok) {
    let errorDetail = `Erreur lors de l'ajustement du stock (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as LoyaltyGift;
}

/**
 * Deletes a gift item from the catalog.
 */

export async function deleteGift(storeUid: string, giftUid: string): Promise<void> {
  const endpoint = getApiEndpoint(`/v1/loyalty/stores/${storeUid}/gifts/${giftUid}`);
  const token = getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    throw new Error('Vous devez être connecté pour supprimer cet article cadeau.');
  }
  if (res.status === 403) {
    throw new Error("Accès refusé : vous n'êtes pas autorisé à supprimer cet article.");
  }
  if (res.status === 404) {
    throw new Error("L'article cadeau spécifié n'existe pas.");
  }
  if (!res.ok) {
    throw new Error(`Erreur lors de la suppression du cadeau (${res.status})`);
  }
}

/**
 * Retrieves the 15-day sliding window activity evaluation and VFP status for a user.
 * Restricted to the user themselves or administrators.
 */

export async function getUserActivityEvaluation(userId: string): Promise<UserActivityEvaluation> {
  const endpoint = getApiEndpoint(
    `/v1/loyalty/users/${encodeURIComponent(userId)}/activity-evaluation`
  );
  const token = getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    throw new Error('Vous devez être connecté pour consulter votre activité.');
  }
  if (res.status === 403) {
    throw new Error('Accès refusé : vous ne pouvez consulter que votre propre activité.');
  }
  if (!res.ok) {
    let errorDetail = `Impossible de récupérer l'évaluation d'activité (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.error) errorDetail = errorJson.error;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as UserActivityEvaluation;
}

/**
 * Retrieves the Very Faithful Person (VFP) qualification status and metrics for a user.
 * Restricted to the user themselves or administrators.
 */

export async function getUserVfpStatus(userId: string): Promise<UserVfpStatus> {
  const endpoint = getApiEndpoint(`/v1/loyalty/users/${encodeURIComponent(userId)}/vfp-status`);
  const token = getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    throw new Error('Vous devez être connecté pour consulter votre statut VFP.');
  }
  if (res.status === 403) {
    throw new Error('Accès refusé : vous ne pouvez consulter que votre propre statut VFP.');
  }
  if (!res.ok) {
    let errorDetail = `Impossible de récupérer le statut VFP (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.error) errorDetail = errorJson.error;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as UserVfpStatus;
}

/**
 * Retrieves a customer's VFP progression metrics, maintenance requirements, and revocation countdown.
 * Restricted to the user themselves or administrators.
 */

export async function getUserVfpProgress(userId: string): Promise<UserVfpProgress> {
  const endpoint = getApiEndpoint(`/v1/loyalty/users/${encodeURIComponent(userId)}/vfp-progress`);
  const token = getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    throw new Error('Vous devez être connecté pour consulter votre progression VFP.');
  }
  if (res.status === 403) {
    throw new Error('Accès refusé : vous ne pouvez consulter que votre propre progression VFP.');
  }
  if (!res.ok) {
    let errorDetail = `Impossible de récupérer la progression VFP (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.error) errorDetail = errorJson.error;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as UserVfpProgress;
}

/**
 * Extracts a user's approved payment transactions within a date range.
 */

export async function getUserPointsBalance(
  userId?: string,
  token?: string
): Promise<UserPointsBalanceResponse> {
  const authToken = token || getAuthToken();
  const hasUserId = userId !== undefined && userId !== null && userId.trim() !== '';
  const path = hasUserId
    ? `/v1/loyalty/users/${encodeURIComponent(userId.trim())}/balance`
    : '/v1/loyalty/balance';
  const endpoint = getApiEndpoint(path);

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
    let detail = `Impossible de récupérer votre solde de points fidélité (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) detail = err.message;
      else if (err.detail) detail = err.detail;
    } catch {
      // Ignorer si la réponse d'erreur n'est pas en JSON
    }
    throw new Error(detail);
  }

  return (await res.json()) as UserPointsBalanceResponse;
}

export async function getCustomerLoyaltyPoints(
  customerId: string,
  token?: string
): Promise<number> {
  const authToken = token || getAuthToken();
  const endpoint = getApiEndpoint(`/v1/loyalty/customers/${encodeURIComponent(customerId)}/points`);
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const res = await fetchWithTimeout(endpoint, {
      method: 'GET',
      headers,
    });
    if (!res.ok) {
      return 0;
    }
    const data = await res.json();
    return typeof data.balance === 'number'
      ? data.balance
      : typeof data.points === 'number'
        ? data.points
        : 0;
  } catch {
    return 0;
  }
}

/**
 * Retrieves a customer's current loyalty points balance for an authenticated merchant or admin.
 * Throws an explicit error on auth or server failure so cashier validation never relies on a stale 0 fallback.
 */

export async function getCustomerPointsBalanceForMerchant(customerId: string): Promise<number> {
  const token = getAuthToken();
  const endpoint = getApiEndpoint(`/v1/loyalty/customers/${encodeURIComponent(customerId)}/points`);
  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    throw new Error('Authentification requise pour consulter le solde de points du client.');
  }
  if (res.status === 403) {
    throw new Error('Accès refusé pour consulter le solde de points de ce client.');
  }
  if (!res.ok) {
    let errorDetail = `Impossible de récupérer le solde de points du client (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
    } catch {}
    throw new Error(errorDetail);
  }

  const data = await res.json();
  return typeof data.balance === 'number'
    ? data.balance
    : typeof data.points === 'number'
      ? data.points
      : 0;
}

/**
 * Validates an in-store physical gift redemption for an identified customer,
 * atomically verifying and debiting loyalty points without checking store stock.
 */

export async function redeemPhysicalGifts(
  storeUid: string,
  payload: PhysicalGiftRedemptionRequest
): Promise<PhysicalGiftRedemptionResponse> {
  const token = getAuthToken();
  const endpoint = getApiEndpoint(
    `/v1/loyalty/stores/${encodeURIComponent(storeUid)}/gifts/physical-redemption`
  );
  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    throw new Error('Authentification requise pour valider la remise de cadeaux.');
  }
  if (res.status === 403) {
    throw new Error("Accès refusé : vous n'êtes pas autorisé à valider des lots pour ce commerce.");
  }
  if (res.status === 404) {
    throw new Error('Commerce ou cadeau introuvable.');
  }
  if (res.status === 409) {
    let conflictDetail = 'Cette remise de cadeaux a déjà été enregistrée.';
    try {
      const errorJson = await res.json();
      if (errorJson.message) conflictDetail = errorJson.message;
    } catch {}
    throw new Error(conflictDetail);
  }
  if (!res.ok) {
    let errorDetail = `Erreur lors de la validation des cadeaux (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.error) errorDetail = errorJson.error;
    } catch {}
    throw new Error(errorDetail);
  }

  return (await res.json()) as PhysicalGiftRedemptionResponse;
}

export async function activateVfpParkingSession(
  licensePlate: string
): Promise<ParkingSessionAcknowledgment> {
  const endpoint = getApiEndpoint('/v1/loyalty/vfp/parking-sessions');
  const token = getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ licensePlate }),
  });

  if (!res.ok) {
    const mappedMessage = PARKING_ERROR_MESSAGES[res.status];
    if (mappedMessage) {
      throw new Error(mappedMessage);
    }
    throw new Error(`Impossible d'activer la session de stationnement (HTTP ${res.status}).`);
  }

  return (await res.json()) as ParkingSessionAcknowledgment;
}

const TRANSIT_ERROR_MESSAGES: Record<number, string> = {
  401: 'Vous devez être connecté pour activer votre titre de transport gratuit.',
  403: 'Cet avantage est réservé aux usagers disposant du statut VFP actif.',
  409: 'Vous avez déjà consommé votre avantage institutionnel gratuit aujourd’hui (stationnement ou transport).',
  502: 'Le service des transports en commun est temporairement indisponible. Veuillez réessayer.',
};

export async function activateVfpTransitTicket(): Promise<TransitTicketAcknowledgment> {
  const endpoint = getApiEndpoint('/v1/loyalty/vfp/transit-tickets');
  const token = getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const mappedMessage = TRANSIT_ERROR_MESSAGES[res.status];
    if (mappedMessage) {
      throw new Error(mappedMessage);
    }
    throw new Error(`Impossible d'activer le titre de transport (HTTP ${res.status}).`);
  }

  return (await res.json()) as TransitTicketAcknowledgment;
}

export async function getVfpDailyEligibility(): Promise<VfpDailyEligibility> {
  const endpoint = getApiEndpoint('/v1/loyalty/vfp/daily-eligibility');
  const token = getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Impossible de vérifier l'éligibilité journalière VFP (HTTP ${res.status}).`);
  }

  return (await res.json()) as VfpDailyEligibility;
}

export interface GiftCartEligibility {
  balance: number;
  heldPoints: number;
  availablePoints: number;
  isVfp: boolean;
  eligibleStoreUids: string[];
}

export async function getGiftCartEligibility(
  storeUid?: string,
  authToken?: string
): Promise<GiftCartEligibility> {
  const query = storeUid ? `?storeUid=${encodeURIComponent(storeUid)}` : '';
  const endpoint = getApiEndpoint(`/v1/loyalty/gifts/eligibility${query}`);
  const token = authToken ?? getAuthToken();
  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Impossible de vérifier l'éligibilité aux cadeaux (HTTP ${res.status}).`);
  }

  return (await res.json()) as GiftCartEligibility;
}

/**
 * Retrieves the configured email address for citizen physical card notifications.
 * Restricted to administrators.
 */
