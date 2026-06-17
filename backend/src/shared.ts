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
export type EventStatus = 'active' | 'draft' | 'archived';

export interface InsertZone {
  zone_id?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  visibility?: string;
  [key: string]: unknown;
}

export interface EventScene {
  location?: string;
  venue?: string;
  time_period?: string;
  type?: string;
  lighting?: string;
  weather?: string;
  crowd_density?: string;
  atmosphere?: string | string[];
  description?: string;
  [key: string]: unknown;
}

export interface EventCamera {
  angle?: string;
  distance?: string;
  depth_of_field?: string;
  lighting?: string;
  style?: string;
  shot_type?: string;
  lens?: string;
  [key: string]: unknown;
}

export interface EventGeneration {
  prompt_template: string;
  negative_prompt?: string;
  background_image?: string;
  insert_zone?: string | InsertZone;
}

export interface Event {
  id: string;
  title: string;
  category: string;
  event_type?: string;
  scene: EventScene;
  camera: EventCamera;
  generation: EventGeneration;
  thumbnailUrl?: string;
  referenceVideo?: string;
  status: EventStatus;
  createdAt: number;
}

// ─── Generation ─────────────────────────────────────────
export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Generation {
  id: string;
  userId: string;
  eventId: string;
  inputImage: string;         // R2 key or 'base64-direct'
  outputImage?: string;       // Agnes image URL
  outputVideo?: string;       // Agnes video URL
  agnesJobId?: string;
  status: GenerationStatus;
  errorMessage?: string;
  captions?: string;          // JSON string
  selectedCaption?: string;
  football?: string;          // JSON string of football overlay data
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
  eventCategory?: string;
  eventThumbnail?: string;
}

// ─── Request Bodies ─────────────────────────────────────
export interface GenerateRequest {
  eventId: string;
  imageKey: string;
  football?: {
    teamA: string;
    teamB: string;
    score: string;     // "3-2"
    mood: string;      // "euphoria"
    userTeam?: string; // team whose jersey the user wears
  };
}

export interface CreateEventRequest {
  title: string;
  category: string;
  scene?: Partial<EventScene>;
  camera?: Partial<EventCamera>;
  generation: EventGeneration;
  thumbnailUrl?: string;
  status?: EventStatus;
}

export interface UpdateEventRequest {
  title?: string;
  category?: string;
  scene?: Partial<EventScene>;
  camera?: Partial<EventCamera>;
  generation?: Partial<EventGeneration>;
  thumbnailUrl?: string;
  status?: EventStatus;
}

// ─── Constants ──────────────────────────────────────────
export const MAX_SELFIE_SIZE = 10 * 1024 * 1024;
export const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024;
export const SIGNED_URL_EXPIRY = 900;
export const SIGNED_URL_EXPIRY_LONG = 3600; // 1 hour for video generation
export const POLL_INTERVAL_MS = 3000;
export const DEFAULT_PAGE_SIZE = 20;

export const R2_DIRS = {
  UPLOADS: 'uploads',
  OUTPUTS: 'outputs',
  EVENTS: 'events',
} as const;
