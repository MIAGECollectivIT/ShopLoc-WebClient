export interface ResolveImageOptions {
  storeUid?: string | null;
  productUid?: string | null;
  imageUrl?: string | null;
}

/**
 * Returns a browser-accessible relative API path for `<img src="...">` tags.
 * Unlike `getApiEndpoint()`, this must NEVER inject internal Kubernetes service hostnames
 * (e.g. `http://store-service:8080`) during Astro SSR, because `<img>` tags are always
 * fetched by the client browser via `/v1/[...path]` or Ingress.
 */
function getBrowserImageEndpoint(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Resolves a reliable, browser-accessible URL for a product image hosted on S3/MinIO.
 *
 * Handles:
 * - Local blob previews (URL.createObjectURL)
 * - Internal Docker / K8s hostnames (http://minio:9000/product-images/...) converted to public backend stream URL
 * - Absolute public URLs (https://...)
 * - Fallback to backend streaming endpoint: /v1/stores/{storeUid}/products/{productUid}/image
 */
export function resolveProductImageUrl(options: ResolveImageOptions): string | null {
  const { storeUid, productUid, imageUrl } = options;

  if (imageUrl) {
    const trimmed = imageUrl.trim();

    // 1. In-memory object preview (during upload) or base64 data URI
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
      return trimmed;
    }

    // 2. MinIO internal docker/k8s address (unreachable directly from browser)
    // Divert through backend streaming endpoint if storeUid & productUid are present
    if (trimmed.includes('minio:9000') || trimmed.includes('minio-shoploc-dev')) {
      if (storeUid && productUid) {
        return getBrowserImageEndpoint(`/v1/stores/${storeUid}/products/${productUid}/image`);
      }
    }

    // 3. Localhost:9000 accessed from non-localhost (e.g. mobile or remote dev browser)
    if (
      typeof window !== 'undefined' &&
      trimmed.includes('localhost:9000') &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      if (storeUid && productUid) {
        return getBrowserImageEndpoint(`/v1/stores/${storeUid}/products/${productUid}/image`);
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

  // 5. If no explicit imageUrl string exists, but storeUid & productUid are known, try backend streaming endpoint
  if (storeUid && productUid) {
    return getBrowserImageEndpoint(`/v1/stores/${storeUid}/products/${productUid}/image`);
  }

  return null;
}

/**
 * Returns the direct backend streaming endpoint URL for a given product image.
 */
export function getProductApiImageUrl(storeUid: string, productUid: string): string {
  return getBrowserImageEndpoint(`/v1/stores/${storeUid}/products/${productUid}/image`);
}

export interface ResolveGiftImageOptions {
  storeUid?: string | null;
  giftUid?: string | null;
  imageUrl?: string | null;
}

/**
 * Resolves a reliable, browser-accessible URL for a gift image hosted on S3/MinIO.
 *
 * Handles:
 * - Local blob previews (URL.createObjectURL)
 * - Internal Docker / K8s hostnames (http://minio:9000/product-images/...) converted to backend streaming endpoint
 * - Absolute public URLs (https://...)
 * - Fallback to backend streaming endpoint: /v1/loyalty/stores/{storeUid}/gifts/{giftUid}/image
 */
export function resolveGiftImageUrl(options: ResolveGiftImageOptions): string | null {
  const { storeUid, giftUid, imageUrl } = options;

  if (imageUrl) {
    const trimmed = imageUrl.trim();

    // 1. In-memory object preview (during upload) or base64 data URI
    if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
      return trimmed;
    }

    // 2. MinIO internal docker/k8s address (unreachable directly from browser)
    if (trimmed.includes('minio:9000') || trimmed.includes('minio-shoploc-dev')) {
      if (storeUid && giftUid) {
        return getBrowserImageEndpoint(`/v1/loyalty/stores/${storeUid}/gifts/${giftUid}/image`);
      }
    }

    // 3. Localhost:9000 accessed from non-localhost
    if (
      typeof window !== 'undefined' &&
      trimmed.includes('localhost:9000') &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      if (storeUid && giftUid) {
        return getBrowserImageEndpoint(`/v1/loyalty/stores/${storeUid}/gifts/${giftUid}/image`);
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

  // 5. If no explicit imageUrl string exists, but storeUid & giftUid are known, try backend streaming endpoint
  if (storeUid && giftUid) {
    return getBrowserImageEndpoint(`/v1/loyalty/stores/${storeUid}/gifts/${giftUid}/image`);
  }

  return null;
}

/**
 * Returns the direct backend streaming endpoint URL for a given gift image.
 */
export function getGiftApiImageUrl(storeUid: string, giftUid: string): string {
  return getBrowserImageEndpoint(`/v1/loyalty/stores/${storeUid}/gifts/${giftUid}/image`);
}

/**
 * Store Image URL Resolution Utility.
 * Bridges differences between internal Docker/Kubernetes network names and browser-reachable endpoints.
 */

const INTERNAL_MINIO_REGEX = /https?:\/\/minio(-shoploc-dev)?:9000/;
const LOCALHOST_MINIO = 'localhost:9000';

/**
 * Resolves a reliable, browser-accessible URL for a store image hosted on S3/MinIO.
 *
 * Supported formats:
 * - Local in-memory blob previews (`blob:...`) or Base64 data URIs (`data:...`)
 * - Internal Docker / K8s hostnames (`http://minio:9000/store-images/...`) converted to backend streaming endpoint
 * - Remote / mobile device resolution for local dev
 * - Absolute public URLs (`https://...`) or relative paths (`/...`)
 *
 * @param imageUrl Raw image URL or path stored in the database
 * @param storeUid Optional store UUID identifier for streaming route
 * @returns Fully qualified, browser-accessible image URL or null if invalid/empty
 */
export function resolveStoreImageUrl(
  imageUrl?: string | null,
  storeUid?: string | null
): string | null {
  if (!imageUrl) {
    if (storeUid) {
      return null;
    }
    return null;
  }

  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return null;
  }

  // 1. In-memory object preview (during upload) or base64 data URI
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // 2. MinIO internal docker/k8s address (unreachable directly from browser)
  // Divert through backend streaming endpoint if storeUid is present
  if (INTERNAL_MINIO_REGEX.test(trimmed) || trimmed.includes('minio-shoploc-dev')) {
    if (storeUid) {
      return getBrowserImageEndpoint(`/v1/stores/${storeUid}/image`);
    }
    const hostname =
      typeof window !== 'undefined' && window.location.hostname
        ? window.location.hostname
        : 'localhost';
    return trimmed.replace(INTERNAL_MINIO_REGEX, `http://${hostname}:9000`);
  }

  // 3. Localhost:9000 accessed from remote/mobile device
  if (
    typeof window !== 'undefined' &&
    trimmed.includes(LOCALHOST_MINIO) &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    if (storeUid) {
      return getBrowserImageEndpoint(`/v1/stores/${storeUid}/image`);
    }
    return trimmed.replace(LOCALHOST_MINIO, `${window.location.hostname}:9000`);
  }

  // 4. Standard valid HTTP/HTTPS or relative URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }

  return trimmed;
}
