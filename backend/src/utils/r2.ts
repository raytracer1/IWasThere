import type { R2Bucket } from '@cloudflare/workers-types';
import { SIGNED_URL_EXPIRY } from '../shared';

/**
 * Generate a presigned URL for an R2 object (for reading).
 * Note: Cloudflare R2 presigned URLs aren't built-in — we use Workers
 * to serve objects with temporary tokens. This helper generates a signed
 * URL using an HMAC approach, or if that's not available, we return a
 * proxy URL through our Worker.
 *
 * Strategy: Return a Worker proxy URL with a signed query parameter.
 * GET /assets/:key?token=<hmac>&expires=<timestamp>
 */

export async function generateSignedUrl(
  key: string,
  secret: string,
  baseUrl: string,
  expirySeconds = SIGNED_URL_EXPIRY,
): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + expirySeconds;

  // Simple HMAC-based signing using Web Crypto API
  const encoder = new TextEncoder();
  const message = `${key}:${expires}`;
  const keyData = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    keyData,
    encoder.encode(message)
  );

  const token = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return `${baseUrl}/assets/${key}?token=${encodeURIComponent(token)}&expires=${expires}`;
}

/**
 * Verify a signed token for R2 object access.
 */
export async function verifySignedToken(
  key: string,
  token: string,
  expires: number,
  secret: string
): Promise<boolean> {
  if (Date.now() / 1000 > expires) return false;

  const encoder = new TextEncoder();
  const message = `${key}:${expires}`;
  const keyData = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expectedSig = await crypto.subtle.sign(
    'HMAC',
    keyData,
    encoder.encode(message)
  );

  const expectedToken = btoa(String.fromCharCode(...new Uint8Array(expectedSig)));

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(token, expectedToken);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Get the full public URL for an R2 object through our Worker.
 */
export function getR2PublicUrl(key: string, workerUrl: string): string {
  return `${workerUrl}/assets/${key}`;
}

/**
 * Upload a file to R2 with the given key.
 */
export async function uploadToR2(
  bucket: R2Bucket,
  key: string,
  body: ArrayBuffer | ReadableStream,
  contentType?: string
): Promise<void> {
  const options: R2PutOptions = {};
  if (contentType) {
    options.httpMetadata = { contentType };
  }
  await bucket.put(key, body, options);
}

/**
 * Delete an object from R2.
 */
export async function deleteFromR2(
  bucket: R2Bucket,
  key: string
): Promise<void> {
  await bucket.delete(key);
}

/**
 * Generate a unique filename for uploads.
 */
/**
 * Sign all R2 asset URLs in an event (thumbnail, background_image, reference_video).
 */
export async function signEventAssetUrls(
  event: Record<string, unknown>,
  secret: string,
  workerUrl: string
): Promise<Record<string, unknown>> {
  const sign = async (key: string | undefined) => {
    if (!key || key.startsWith('http')) return key;
    return generateSignedUrl(key, secret, workerUrl);
  };

  const generation = (event.generation as Record<string, unknown>) || {};

  return {
    ...event,
    thumbnailUrl: await sign(event.thumbnailUrl as string | undefined),
    referenceVideo: await sign(event.referenceVideo as string | undefined),
    generation: {
      ...generation,
      background_image: await sign(generation.background_image as string | undefined),
    },
  };
}

export function generateFileKey(
  userId: string,
  dir: string,
  filename: string
): string {
  const ext = filename.split('.').pop() || 'bin';
  const uuid = crypto.randomUUID();
  return `${dir}/${userId}/${uuid}.${ext}`;
}
