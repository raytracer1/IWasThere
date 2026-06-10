import { getSession } from "next-auth/react";
import type {
  ApiResponse,
  PaginatedResponse,
  Event,
  Job,
  JobWithEvent,
  UploadResponse,
  SwapRequest,
} from "@/lib/types";

const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";

/**
 * Get the access token from the current session.
 * This is a JWT signed by NextAuth, verifiable by the Worker.
 */
async function getAccessToken(): Promise<string | null> {
  // Dev mode: use token from .env.local (never committed)
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.port === "3000")) {
    return process.env.NEXT_PUBLIC_DEV_TOKEN ?? null;
  }
  const session = await getSession();
  return (session as { accessToken?: string } | null)?.accessToken ?? null;
}

/**
 * Fetch wrapper that auto-attaches the access token as Bearer.
 */
async function authFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  // Use native Headers so browser auto-sets Content-Type for FormData
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Only set Content-Type for non-FormData requests
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

// ─── Public API Functions ───────────────────────────────

export async function fetchEvents(
  category?: string,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Event>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (category) params.set("category", category);
  return authFetch<PaginatedResponse<Event>>(`/events?${params}`);
}

export async function fetchEvent(
  eventId: string
): Promise<ApiResponse<Event>> {
  return authFetch<ApiResponse<Event>>(`/events/${eventId}`);
}

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

export async function triggerSwap(
  body: SwapRequest
): Promise<ApiResponse<{ jobId: string; falRequestId: string; status: string }>> {
  return authFetch("/swap", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchJob(
  jobId: string
): Promise<ApiResponse<Job & { event?: Event; outputVideoUrl?: string; inputImageUrl?: string }>> {
  return authFetch(`/job/${jobId}`);
}

export async function fetchHistory(
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<JobWithEvent>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return authFetch(`/history?${params}`);
}

// ─── User ────────────────────────────────────────────────

export async function fetchMe(): Promise<ApiResponse<{ id: string; email: string; role: string; credits: number }>> {
  return authFetch("/me");
}

// ─── Admin API ──────────────────────────────────────────

export async function fetchAdminEvents(
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Event>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return authFetch(`/admin/events?${params}`);
}

export async function createEvent(
  formData: FormData
): Promise<ApiResponse<{ id: string; title: string; category: string }>> {
  return authFetch("/admin/events", {
    method: "POST",
    body: formData,
  });
}

export async function updateEvent(
  eventId: string,
  body: Partial<Pick<Event, "title" | "category" | "description" | "duration" | "price" | "trimRanges" | "status">>
): Promise<ApiResponse<{ id: string }>> {
  return authFetch(`/admin/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function updateEventMultipart(
  eventId: string,
  formData: FormData
): Promise<ApiResponse<{ id: string }>> {
  return authFetch(`/admin/events/${eventId}/update`, {
    method: "POST",
    body: formData,
  });
}

export async function deleteEvent(
  eventId: string
): Promise<ApiResponse<{ id: string }>> {
  return authFetch(`/admin/events/${eventId}`, {
    method: "DELETE",
  });
}
