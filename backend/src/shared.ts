// ─── User ───────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: 'user' | 'admin';
  credits: number;
  createdAt: number;
}

// ─── Event ──────────────────────────────────────────────
export const SPORT_TYPES = [
  'football',
  'basketball',
  'tennis',
  'athletics',
  'cricket',
  'boxing',
  'american_football',
  'other',
] as const;

export type SportType = (typeof SPORT_TYPES)[number];

export type EventStatus = 'active' | 'draft' | 'archived';

export interface Event {
  id: string;
  title: string;
  year: number;
  location?: string;
  sportType: SportType;
  description?: string;
  keyMoment?: string;
  eraClothing?: string;
  imagePrompt: string;
  captionTemplates: string;   // JSON string
  hashtags: string;
  viralScore: number;         // 1.0-10.0
  thumbnailUrl?: string;      // R2 key
  status: EventStatus;
  createdAt: number;
}

// ─── Generation ─────────────────────────────────────────
export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Generation {
  id: string;
  userId: string;
  eventId: string;
  inputImage: string;         // R2 key
  outputImage?: string;       // R2 key
  agnesJobId?: string;
  status: GenerationStatus;
  errorMessage?: string;
  captions?: string;          // JSON string
  selectedCaption?: string;
  createdAt: number;
  completedAt?: number;
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

export interface GenerationWithEvent extends Generation {
  eventTitle?: string;
  eventYear?: number;
  eventSportType?: SportType;
  eventThumbnail?: string;
}

// ─── Request Bodies ─────────────────────────────────────
export interface GenerateRequest {
  eventId: string;
  imageKey: string;
}

export interface CreateEventRequest {
  title: string;
  year: number;
  location?: string;
  sportType: SportType;
  description?: string;
  keyMoment?: string;
  eraClothing?: string;
  imagePrompt: string;
  captionTemplates?: string;
  hashtags?: string;
  viralScore?: number;
  status?: EventStatus;
}

export interface UpdateEventRequest {
  title?: string;
  year?: number;
  location?: string;
  sportType?: SportType;
  description?: string;
  keyMoment?: string;
  eraClothing?: string;
  imagePrompt?: string;
  captionTemplates?: string;
  hashtags?: string;
  viralScore?: number;
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
export const MAX_SELFIE_SIZE = 10 * 1024 * 1024;
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
  UPLOADS: 'uploads',
  OUTPUTS: 'outputs',
  EVENTS: 'events',
} as const;
