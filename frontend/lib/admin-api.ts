const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787";

export async function adminFetch<T>(
  path: string,
  accessToken?: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const resp = await fetch(`${WORKER_URL}${path}`, { ...options, headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? `HTTP ${resp.status}`);
  }
  return resp.json();
}
