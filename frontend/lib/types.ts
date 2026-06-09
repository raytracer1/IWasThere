// ─── User ───────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: 'user' | 'admin';
  createdAt: number;
}

// ─── Event ──────────────────────────────────────────────
export const EVENT_CATEGORIES = [
  'sports',
  'music',
  'movies',
  'news',
  'other',
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export type EventStatus = 'active' | 'draft' | 'archived';

export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  description?: string;
  videoUrl: string;       // R2 object key
  thumbnailUrl?: string;  // R2 object key
  duration?: number;      // seconds
  price?: number;          // USD, minimum 0.50
  trimRanges?: string;     // JSON array of [start,end] frame pairs
  originalVideoUrl?: string; // signed URL of full original video
  status: EventStatus;
  createdBy: string;
  createdAt: number;
}

// ─── Job ────────────────────────────────────────────────
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  userId: string;
  eventId: string;
  falRequestId?: string;
  inputImage: string;     // R2 object key
  outputVideo?: string;   // R2 object key or fal.ai URL
  status: JobStatus;
  errorMessage?: string;
  createdAt: number;
  completedAt?: number;
}

// ─── Rate Limit ─────────────────────────────────────────
export interface RateLimit {
  userId: string;
  date: string;   // YYYY-MM-DD
  count: number;
}

// ─── API Response Wrappers ──────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface JobWithEvent extends Job {
  eventTitle?: string;
  eventCategory?: EventCategory;
  eventThumbnail?: string;
}

// ─── Request Bodies ─────────────────────────────────────
export interface SwapRequest {
  eventId: string;
  imageKey: string;        // R2 key of uploaded selfie
  resolution?: string;
}

export interface CreateEventRequest {
  title: string;
  category: EventCategory;
  description?: string;
  duration?: number;
  price?: number;
  status?: EventStatus;
}

export interface UpdateEventRequest {
  title?: string;
  category?: EventCategory;
  description?: string;
  duration?: number;
  price?: number;
  status?: EventStatus;
}

// ─── Upload Response ────────────────────────────────────
export interface UploadResponse {
  key: string;          // R2 object key
  signedUrl: string;    // Temporary signed URL
  filename: string;
  size: number;
}

// ─── Constants ──────────────────────────────────────────

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
