import { getSession } from "next-auth/react";
import type {
  ApiResponse,
  PaginatedResponse,
  Event,
  Generation,
  UploadResponse,
  GenerateRequest,
} from "@/lib/types";

const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";

async function getAccessToken(): Promise<string | null> {
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.port === "3000")) {
    return process.env.NEXT_PUBLIC_DEV_TOKEN ?? null;
  }
  const session = await getSession();
  return (session as { accessToken?: string } | null)?.accessToken ?? null;
}

async function authFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${WORKER_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ─── Public ──────────────────────────────────────────────

export async function fetchEvents(
  sportType?: string,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Event>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (sportType) params.set("sportType", sportType);
  return authFetch<PaginatedResponse<Event>>(`/events?${params}`);
}

export async function fetchEvent(
  eventId: string
): Promise<ApiResponse<Event>> {
  return authFetch<ApiResponse<Event>>(`/events/${eventId}`);
}

// ─── Authenticated ───────────────────────────────────────

export async function uploadSelfie(
  file: File
): Promise<ApiResponse<UploadResponse>> {
  const formData = new FormData();
  formData.append("file", file);
  return authFetch<ApiResponse<UploadResponse>>("/upload", {
    method: "POST",
    body: formData,
  });
}

export async function triggerGenerate(
  body: GenerateRequest
): Promise<ApiResponse<{ generationId: string; status: string }>> {
  return authFetch("/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchGeneration(
  generationId: string
): Promise<ApiResponse<Generation>> {
  return authFetch(`/generation/${generationId}`);
}

export async function fetchGenerations(
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Generation>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return authFetch(`/generations?${params}`);
}

export async function fetchMe(): Promise<ApiResponse<{ id: string; email: string; role: string; credits: number }>> {
  return authFetch("/me");
}

// ─── Admin ───────────────────────────────────────────────

export async function fetchAdminEvents(
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Event>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return authFetch(`/admin/events?${params}`);
}

export async function createEvent(
  body: Record<string, unknown>
): Promise<ApiResponse<{ id: string }>> {
  return authFetch("/admin/events", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateEvent(
  eventId: string,
  body: Record<string, unknown>
): Promise<ApiResponse<{ id: string }>> {
  return authFetch(`/admin/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteEvent(
  eventId: string
): Promise<ApiResponse<void>> {
  return authFetch(`/admin/events/${eventId}`, {
    method: "DELETE",
  });
}
