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
  insert_zone?: string | InsertZone;
}

export interface Event {
  id: string;
  title: string;
  category: string;
  event_type?: string;
  aspectRatio?: string;
  price?: number;
  scene: EventScene;
  camera: EventCamera;
  generation: EventGeneration;
  thumbnailUrl?: string;     // computed by backend
  backgroundUrl?: string;    // computed by backend
  teams?: { name: string; code: string; flag: string }[];  // from backend per category
  referenceVideo?: string;   // computed by backend
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
  outputVideo?: string;
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
  outputVideoUrl?: string;
  eventTitle?: string;
  eventCategory?: string;
  eventThumbnail?: string;
  football?: string;  // JSON: { teamA, teamB, score, mood, userTeam }
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
  aspectRatio?: string;
  football?: {
    teamA: string;
    teamB: string;
    score: string;
    mood: string;
    userTeam?: string;
  };
}

// ─── Constants ──────────────────────────────────────────
export const MAX_SELFIE_SIZE = 10 * 1024 * 1024;
export const POLL_INTERVAL_MS = 5000;
export const DEFAULT_PAGE_SIZE = 20;
