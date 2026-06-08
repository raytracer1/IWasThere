/** Daily generation limit per user */
export const DAILY_GENERATION_LIMIT = 10;

/** Estimated cost per generation in USD */
export const COST_PER_GENERATION = 0.5;

/** Default swap resolution */
export const DEFAULT_RESOLUTION = '540p';

/** Max selfie upload size in bytes (10 MB) */
export const MAX_SELFIE_SIZE = 10 * 1024 * 1024;

/** Accepted selfie image types */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Max event video upload size in bytes (100 MB) */
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

/** Max event thumbnail size in bytes (5 MB) */
export const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024;

/** Signed URL expiration in seconds (15 minutes) */
export const SIGNED_URL_EXPIRY = 900;

/** R2 bucket directory names */
export const R2_DIRS = {
  HOT_EVENTS: 'hot-events',
  UPLOADS: 'uploads',
  OUTPUTS: 'outputs',
} as const;

/** Job polling interval in milliseconds */
export const POLL_INTERVAL_MS = 3000;

/** Default page size for pagination */
export const DEFAULT_PAGE_SIZE = 20;
