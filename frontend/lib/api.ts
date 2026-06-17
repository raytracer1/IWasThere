import type {
  ApiResponse,
  PaginatedResponse,
  Event,
  Generation,
  GenerateRequest,
} from "@/lib/types";

const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

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

// ─── Public (no auth) ───────────────────────────────────

export async function fetchEvents(
  category?: string,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Event>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (category) params.set("category", category);
  return apiFetch<PaginatedResponse<Event>>(`/events?${params}`);
}

export async function fetchEvent(
  eventId: string
): Promise<ApiResponse<Event>> {
  return apiFetch<ApiResponse<Event>>(`/events/${eventId}`);
}

export async function triggerGenerate(
  body: GenerateRequest,
  token?: string
): Promise<ApiResponse<{ generationId: string; status: string }>> {
  return apiFetch("/generate", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: JSON.stringify(body),
  });
}

export async function fetchGeneration(
  generationId: string,
  token?: string
): Promise<ApiResponse<Generation>> {
  return apiFetch(`/generation/${generationId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

export async function fetchGenerations(
  token: string,
  page = 1,
  pageSize = 20
): Promise<{ success: boolean; data: Generation[]; total: number; page: number; pageSize: number }> {
  return apiFetch(`/generation?page=${page}&pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
