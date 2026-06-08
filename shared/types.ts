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
  status?: EventStatus;
}

export interface UpdateEventRequest {
  title?: string;
  category?: EventCategory;
  description?: string;
  duration?: number;
  status?: EventStatus;
}

// ─── Upload Response ────────────────────────────────────
export interface UploadResponse {
  key: string;          // R2 object key
  signedUrl: string;    // Temporary signed URL
  filename: string;
  size: number;
}
