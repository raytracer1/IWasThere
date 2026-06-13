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
  captionTemplates: string;
  hashtags: string;
  viralScore: number;
  thumbnailUrl?: string;
  status: EventStatus;
  createdAt: number;
}

// ─── Generation ─────────────────────────────────────────
export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Generation {
  id: string;
  userId: string;
  eventId: string;
  inputImage: string;
  outputImage?: string;
  agnesJobId?: string;
  status: GenerationStatus;
  errorMessage?: string;
  captions?: string[];
  selectedCaption?: string;
  createdAt: number;
  completedAt?: number;
  // Enriched fields
  inputImageUrl?: string;
  outputImageUrl?: string;
  eventTitle?: string;
  eventYear?: number;
  eventSportType?: SportType;
  eventThumbnail?: string;
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

// ─── Request Bodies ─────────────────────────────────────
export interface GenerateRequest {
  eventId: string;
  imageBase64: string;
}

// ─── Upload Response ────────────────────────────────────
export interface UploadResponse {
  key: string;
  filename: string;
  size: number;
  contentType: string;
}

// ─── Constants ──────────────────────────────────────────
export const MAX_SELFIE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export const POLL_INTERVAL_MS = 3000;
export const DEFAULT_PAGE_SIZE = 20;
