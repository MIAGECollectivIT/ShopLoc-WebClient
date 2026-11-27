import type {
  Store,
  StoreCreateRequest,
  StorePatchRequest,
  StoreResponse,
  StoreAbsence,
} from '@/types/store';
import type {
  Product,
  ProductCreateRequest,
  ProductUpdateRequest,
  StockUpdateRequest,
} from '@/types/product';
import { getAuthToken } from '../auth';
import { fetchWithTimeout, getApiEndpoint } from './core';

/**
 * Assembles a multipart/form-data payload compliant with Spring Boot's dual @RequestPart contract.
 * - Part "store": application/json Blob containing store metadata
 * - Part "image": binary File stream containing the store picture
 */
function buildStoreMultipartFormData(payload: StoreCreateRequest, image: File): FormData {
  const formData = new FormData();
  formData.append('store', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
  formData.append('image', image);
  return formData;
}

export async function getStores(includeRevoked: boolean = false): Promise<Store[]> {
  const query = includeRevoked ? '?includeRevoked=true' : '';
  const res = await fetchWithTimeout(getApiEndpoint(`/v1/stores${query}`));
  if (!res.ok) {
    throw new Error(`Erreur lors de la récupération des commerces (HTTP ${res.status})`);
  }
  const data: Store[] = await res.json();
  return data;
}

/**
 * Search and filter stores via /v1/stores/search.
 * Supports name query and multiple category filters.
 */

export async function searchStores(params?: {
  query?: string;
  categories?: string[];
}): Promise<Store[]> {
  const queryParams = new URLSearchParams();
  if (params?.query && params.query.trim()) {
    queryParams.set('name', params.query.trim());
  }
  if (params?.categories && params.categories.length > 0) {
    for (const cat of params.categories) {
      if (cat.trim()) {
        queryParams.append('category', cat.trim());
      }
    }
  }
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/v1/stores/search?${queryString}` : '/v1/stores/search';
  const res = await fetchWithTimeout(getApiEndpoint(endpoint));
  if (!res.ok) {
    throw new Error(`Erreur lors de la recherche des commerces (HTTP ${res.status})`);
  }
  const data: Store[] = await res.json();
  return data;
}

export async function getStoreById(storeUid: string): Promise<Store> {
  const res = await fetchWithTimeout(getApiEndpoint(`/v1/stores/${storeUid}`));
  if (!res.ok) {
    throw new Error(`Commerce introuvable (HTTP ${res.status})`);
  }
  const data: Store = await res.json();
  return data;
}

/**
 * Revokes a partner store from the local animation program.
 * Only accessible by ADMIN users.
 */

export async function revokeStore(storeUid: string): Promise<StoreResponse> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeUid}/revoke`);
  const token = getAuthToken();

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message =
      errorBody.message ||
      (res.status === 409
        ? 'Ce commerce est déjà révoqué.'
        : res.status === 403
          ? 'Accès refusé : privilèges administrateur requis.'
          : `Impossible de révoquer le commerce (HTTP ${res.status})`);
    throw new Error(message);
  }

  const data: StoreResponse = await res.json();
  return data;
}

/**
 * Reactivates a previously revoked partner store with a new valid RIB/IBAN.
 * Only accessible by ADMIN users.
 */

export async function reactivateStore(
  storeUid: string,
  rib: string,
  ownerUid?: string
): Promise<StoreResponse> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeUid}/reactivate`);
  const token = getAuthToken();

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ rib, ...(ownerUid ? { ownerUid } : {}) }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message =
      errorBody.message ||
      (res.status === 409
        ? "Ce commerce n'est pas révoqué."
        : res.status === 403
          ? 'Accès refusé : privilèges administrateur requis.'
          : res.status === 400
            ? 'Format de RIB ou IBAN invalide.'
            : `Impossible de réactiver le commerce (HTTP ${res.status})`);
    throw new Error(message);
  }

  const data: StoreResponse = await res.json();
  return data;
}

/**
 * Retrieves the stores belonging to the currently authenticated merchant (anti-IDOR).
 */

export async function getMyStores(serverToken?: string): Promise<StoreResponse[]> {
  const endpoint = getApiEndpoint('/v1/stores/me');
  const token = serverToken || getAuthToken();

  const res = await fetchWithTimeout(endpoint, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Impossible de récupérer vos commerces (HTTP ${res.status})`);
  }

  const data: StoreResponse[] = await res.json();
  return data;
}

/**
 * Retrieves registered partner accounts from users-service.
 * Filters across name, company name, and email.
 */

export async function createStore(
  payload: StoreCreateRequest,
  image?: File | null
): Promise<StoreResponse> {
  const endpoint = getApiEndpoint('/v1/stores');
  const token = getAuthToken();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const requestInit: RequestInit = image
    ? {
        method: 'POST',
        headers: { ...authHeaders },
        body: buildStoreMultipartFormData(payload, image),
      }
    : {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      };

  const res = await fetchWithTimeout(endpoint, requestInit);

  if (!res.ok) {
    let errorDetail = `Erreur lors de la création du commerce (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.error) errorDetail = errorJson.error;
    } catch {
      // Ignore JSON parsing error
    }
    throw new Error(errorDetail);
  }

  const data: StoreResponse = await res.json();
  return data;
}

/**
 * Partially updates store information.
 */

export async function patchStore(
  storeUid: string,
  payload: StorePatchRequest
): Promise<StoreResponse> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeUid}`);
  const token = getAuthToken();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetchWithTimeout(endpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorDetail = `Erreur lors de la mise à jour du commerce (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.error) errorDetail = errorJson.error;
    } catch {
      // Ignore
    }
    throw new Error(errorDetail);
  }

  const data: StoreResponse = await res.json();
  return data;
}

/**
 * Retrieves the list of absences for a store.
 */

export async function getStoreAbsences(storeUid: string): Promise<StoreAbsence[]> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeUid}/absences`);
  const token = getAuthToken();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetchWithTimeout(endpoint, {
    method: 'GET',
    headers: {
      ...authHeaders,
    },
  });

  if (!res.ok) {
    throw new Error(`Impossible de récupérer les absences du commerce (${res.status})`);
  }

  return res.json();
}

/**
 * Adds an absence to a store schedule.
 */

export async function addStoreAbsence(
  storeUid: string,
  absence: { startDate: string; endDate?: string | null; reason?: string | null }
): Promise<StoreResponse> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeUid}/absences`);
  const token = getAuthToken();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(absence),
  });

  if (!res.ok) {
    let errorDetail = `Erreur lors de l'ajout de l'absence (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.error) errorDetail = errorJson.error;
    } catch {
      // Ignore
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

/**
 * Updates an existing store absence.
 */

export async function updateStoreAbsence(
  storeUid: string,
  absenceUid: string,
  absence: { startDate: string; endDate?: string | null; reason?: string | null }
): Promise<StoreResponse> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeUid}/absences/${absenceUid}`);
  const token = getAuthToken();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetchWithTimeout(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(absence),
  });

  if (!res.ok) {
    let errorDetail = `Erreur lors de la modification de l'absence (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.error) errorDetail = errorJson.error;
    } catch {
      // Ignore
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

/**
 * Deletes a specific absence or all absences for a store.
 */

export async function deleteStoreAbsence(
  storeUid: string,
  absenceUid?: string
): Promise<StoreResponse> {
  const endpoint = absenceUid
    ? getApiEndpoint(`/v1/stores/${storeUid}/absences/${absenceUid}`)
    : getApiEndpoint(`/v1/stores/${storeUid}/absence`);
  const token = getAuthToken();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const res = await fetchWithTimeout(endpoint, {
      method: 'DELETE',
      headers: {
        ...authHeaders,
      },
    });

    if (res.ok) {
      const data: StoreResponse = await res.json();
      return data;
    }
  } catch {
    // Fallback to PATCH clearAbsence if DELETE is not supported by proxy
  }

  if (!absenceUid) {
    return patchStore(storeUid, { clearAbsence: true });
  }
  throw new Error("Impossible de supprimer l'absence sélectionnée");
}

/**
 * Updates a store's storefront image via S3 multipart endpoint.
 */

export async function updateStoreImage(storeUid: string, imageFile: File): Promise<StoreResponse> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeUid}/image`);
  const token = getAuthToken();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const formData = new FormData();
  formData.append('image', imageFile);

  const res = await fetchWithTimeout(endpoint, {
    method: 'PATCH',
    headers: {
      ...authHeaders,
    },
    body: formData,
  });

  if (!res.ok) {
    let errorDetail = `Erreur lors de la mise à jour de l'image (${res.status})`;
    try {
      const errorJson = await res.json();
      if (errorJson.message) errorDetail = errorJson.message;
      else if (errorJson.error) errorDetail = errorJson.error;
    } catch {
      // Ignore
    }
    throw new Error(errorDetail);
  }

  const data: StoreResponse = await res.json();
  return data;
}

/**
 * Retrieves automated turnover metrics generated by the ShopLoc application for a store.
 */

export async function getStoreProducts(storeUid: string): Promise<Product[]> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeUid}/products`);
  const res = await fetchWithTimeout(endpoint);
  if (!res.ok) {
    throw new Error(`Impossible de récupérer les produits du magasin (HTTP ${res.status})`);
  }
  return (await res.json()) as Product[];
}

/**
 * Retrieves a single product by storeUid and productUid.
 */

export async function getProductById(storeUid: string, productUid: string): Promise<Product> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeUid}/products/${productUid}`);
  const res = await fetchWithTimeout(endpoint);
  if (!res.ok) {
    throw new Error(`Produit introuvable (HTTP ${res.status})`);
  }
  return (await res.json()) as Product;
}

/**
 * Creates a new product in the store catalogue (JSON or Multipart with S3 image upload).
 */

export async function createProduct(
  storeUid: string,
  data: ProductCreateRequest,
  imageFile?: File
): Promise<Product> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeUid}/products`);
  const token = getAuthToken();

  let body: BodyInit;
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (imageFile) {
    const formData = new FormData();
    const productBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('product', productBlob, 'product.json');
    formData.append('image', imageFile, imageFile.name);
    formData.append('file', imageFile, imageFile.name);
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

  if (!res.ok) {
    let detail = `Erreur lors de la création du produit (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) detail = err.message;
      else if (err.detail) detail = err.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await res.json()) as Product;
}

/**
 * Updates an existing product (JSON or Multipart with S3 image upload).
 */

export async function updateProduct(
  storeUid: string,
  productUid: string,
  data: ProductUpdateRequest,
  imageFile?: File
): Promise<Product> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeUid}/products/${productUid}`);
  const token = getAuthToken();

  let body: BodyInit;
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (imageFile) {
    const formData = new FormData();
    const productBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    formData.append('product', productBlob, 'product.json');
    formData.append('image', imageFile, imageFile.name);
    formData.append('file', imageFile, imageFile.name);
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

  if (!res.ok) {
    let detail = `Erreur lors de la mise à jour du produit (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) detail = err.message;
      else if (err.detail) detail = err.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await res.json()) as Product;
}

/**
 * Uploads or updates a product image via S3 multipart endpoint PATCH /v1/stores/{storeUid}/products/{productUid}/image.
 */

export async function updateProductImage(
  storeUid: string,
  productUid: string,
  imageFile: File
): Promise<Product> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeUid}/products/${productUid}/image`);
  const token = getAuthToken();

  const formData = new FormData();
  formData.append('image', imageFile);

  const res = await fetchWithTimeout(endpoint, {
    method: 'PATCH',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    let detail = `Erreur lors de la mise à jour de l'image (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) detail = err.message;
      else if (err.detail) detail = err.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await res.json()) as Product;
}

/**
 * Updates a product image with a direct URL via JSON endpoint PATCH /v1/stores/{storeUid}/products/{productUid}/image.
 */

export async function updateProductImageUrl(
  storeUid: string,
  productUid: string,
  imageUrl: string
): Promise<Product> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeUid}/products/${productUid}/image`);
  const token = getAuthToken();

  const res = await fetchWithTimeout(endpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ imageUrl }),
  });

  if (!res.ok) {
    let detail = `Erreur lors de la mise à jour de l'URL de l'image (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) detail = err.message;
      else if (err.detail) detail = err.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await res.json()) as Product;
}

/**
 * Deletes a product from the store catalog.
 */

export async function deleteProduct(storeUid: string, productUid: string): Promise<void> {
  const endpoint = getApiEndpoint(`/v1/stores/${storeUid}/products/${productUid}`);
  const token = getAuthToken();

  const res = await fetchWithTimeout(endpoint, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok && res.status !== 204) {
    let detail = `Erreur lors de la suppression du produit (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) detail = err.message;
    } catch {}
    throw new Error(detail);
  }
}

/**
 * Granularly adjusts product inventory stock via PATCH.
 */

export async function updateProductStock(
  storeUid: string,
  productUid: string,
  stockUpdate: StockUpdateRequest
): Promise<Product> {
  const payload: Record<string, number> = {};
  if (typeof stockUpdate.quantityDelta === 'number') {
    payload.quantityDelta = stockUpdate.quantityDelta;
  } else if (typeof stockUpdate.delta === 'number') {
    payload.quantityDelta = stockUpdate.delta;
  }
  if (typeof stockUpdate.newQuantity === 'number') {
    payload.newQuantity = stockUpdate.newQuantity;
  }

  const endpoint = getApiEndpoint(`/v1/stores/${storeUid}/products/${productUid}/stock`);
  const token = getAuthToken();

  const res = await fetchWithTimeout(endpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = `Erreur lors de la mise à jour du stock (HTTP ${res.status})`;
    try {
      const err = await res.json();
      if (err.message) detail = err.message;
      else if (err.detail) detail = err.detail;
    } catch {}
    throw new Error(detail);
  }

  return (await res.json()) as Product;
}
