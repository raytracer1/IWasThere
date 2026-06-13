"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/useAppSession";
import { fetchAdminEvents, deleteEvent } from "@/lib/api";
import type { Event } from "@/lib/types";

export default function AdminPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    loadEvents();
  }, [isAdmin]);

  async function loadEvents() {
    setLoading(true);
    try {
      const res = await fetchAdminEvents();
      setEvents(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-gray-400">Sign in required.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-gray-400">Admin access only.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">⚙️ Event Admin</h1>
        <button
          onClick={loadEvents}
          className="text-sm text-cyan-400 hover:underline"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-900/60 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-gray-900/60 p-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{event.title}</p>
                <p className="text-xs text-gray-400">
                  {event.sportType} · {event.year} · Viral: {event.viralScore} ·{" "}
                  <span className={
                    event.status === "active" ? "text-green-400" :
                    event.status === "draft" ? "text-yellow-400" : "text-gray-500"
                  }>
                    {event.status}
                  </span>
                </p>
              </div>
              <button
                onClick={() => handleDelete(event.id)}
                className="shrink-0 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
