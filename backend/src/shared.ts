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
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  price?: number;          // USD, minimum 0.50
  trimRanges?: string;
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
  inputImage: string;
  outputVideo?: string;
  status: JobStatus;
  errorMessage?: string;
  createdAt: number;
  completedAt?: number;
}

// ─── Rate Limit ─────────────────────────────────────────
export interface RateLimit {
  userId: string;
  date: string;
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
  imageKey: string;
  resolution?: string;
}

export interface CreateEventRequest {
  title: string;
  category: EventCategory;
  description?: string;
  duration?: number;
  price?: number;          // USD, minimum 0.50
  trimRanges?: string;
  status?: EventStatus;
}

export interface UpdateEventRequest {
  title?: string;
  category?: EventCategory;
  description?: string;
  duration?: number;
  price?: number;          // USD, minimum 0.50
  trimRanges?: string;
  status?: EventStatus;
}

// ─── Upload Response ────────────────────────────────────
export interface UploadResponse {
  key: string;
  signedUrl: string;
  filename: string;
  size: number;
}

// ─── Constants ──────────────────────────────────────────

export const DAILY_GENERATION_LIMIT = 10;
export const COST_PER_GENERATION = 0.5;
export const DEFAULT_RESOLUTION = '540p';
export const MAX_SELFIE_SIZE = 10 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
export const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024;
export const SIGNED_URL_EXPIRY = 900;
export const POLL_INTERVAL_MS = 3000;
export const DEFAULT_PAGE_SIZE = 20;

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const R2_DIRS = {
  HOT_EVENTS: 'hot-events',
  UPLOADS: 'uploads',
  OUTPUTS: 'outputs',
} as const;
