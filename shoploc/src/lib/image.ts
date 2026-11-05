import { getApiEndpoint } from './api';

export interface ResolveImageOptions {
  storeId?: number | string | null;
  productId?: number | string | null;
  imageUrl?: string | null;
}

/**
 * Resolves a reliable, browser-accessible URL for a product image hosted on S3/MinIO.
 *
 * Handles:
 * - Local blob previews (URL.createObjectURL)
 * - Internal Docker / K8s hostnames (http://minio:9000/product-images/...) converted to public backend stream URL
 * - Absolute public URLs (https://...)
 * - Fallback to backend streaming endpoint: /v1/stores/{storeId}/products/{productId}/image
 */
export function resolveProductImageUrl(options: ResolveImageOptions): string | null {
  const { storeId, productId, imageUrl } = options;

  if (imageUrl) {
    const trimmed = imageUrl.trim();

    // 1. In-memory object preview (during upload) or base64 data URI
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
      return trimmed;
    }

    // 2. MinIO internal docker/k8s address (unreachable directly from browser)
    // Divert through backend streaming endpoint if storeId & productId are present
    if (trimmed.includes('minio:9000') || trimmed.includes('minio-shoploc-dev')) {
      if (storeId && productId) {
        return getApiEndpoint(`/v1/stores/${storeId}/products/${productId}/image`);
      }
    }

    // 3. Localhost:9000 accessed from non-localhost (e.g. mobile or remote dev browser)
    if (
      typeof window !== 'undefined' &&
      trimmed.includes('localhost:9000') &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      if (storeId && productId) {
        return getApiEndpoint(`/v1/stores/${storeId}/products/${productId}/image`);
      }
    }

    // 4. Standard valid HTTP/HTTPS URL
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/')
    ) {
      return trimmed;
    }
  }

  // 5. If no explicit imageUrl string exists, but storeId & productId are known, try backend streaming endpoint
  if (storeId && productId) {
    return getApiEndpoint(`/v1/stores/${storeId}/products/${productId}/image`);
  }

  return null;
}

/**
 * Returns the direct backend streaming endpoint URL for a given product image.
 */
export function getProductApiImageUrl(
  storeId: number | string,
  productId: number | string
): string {
  return getApiEndpoint(`/v1/stores/${storeId}/products/${productId}/image`);
}
