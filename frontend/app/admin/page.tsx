"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Event } from "@/lib/types";
import { adminFetch } from "@/lib/admin-api";
import AuthGuard from "@/components/admin/AuthGuard";

export default function AdminListPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch<{ success: boolean; data: Event[] }>(
        "/admin/events",
        accessToken
      );
      setEvents(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) loadEvents();
  }, [accessToken, loadEvents]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await adminFetch(`/admin/events/${id}`, accessToken, { method: "DELETE" });
      loadEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <AuthGuard>
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">⚙️ Event Admin</h1>
        </div>

        {/* New Event Button */}
        <button
          onClick={() => router.push("/admin/new")}
          className="mb-6 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-cyan-700 transition-colors"
        >
          + New Event
        </button>

        {/* Event Grid */}
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="rounded-2xl border border-white/10 bg-gray-900/60 backdrop-blur-sm overflow-hidden group"
              >
                {/* Thumbnail */}
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
                  {ev.thumbnailUrl ? (
                    <img
                      src={ev.thumbnailUrl}
                      alt={ev.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">
                      🏟️
                    </div>
                  )}
                  <div className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-xs text-white capitalize">
                    {ev.category.replace("_", " ")}
                  </div>
                  <div className={`absolute top-2 right-2 rounded-md px-2 py-0.5 text-xs font-medium ${
                    ev.status === "active" ? "bg-green-500/80 text-white" : "bg-yellow-500/80 text-black"
                  }`}>
                    {ev.status}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs text-gray-400 mb-1">{ev.event_type || ""} · {ev.scene?.time_period || ""}</p>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug mb-2">
                    {ev.title}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/admin/${ev.id}`)}
                      className="flex-1 rounded-lg bg-cyan-600/20 border border-cyan-500/30 py-1.5 text-xs text-cyan-300 hover:bg-cyan-600/30 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(ev.id)}
                      className="flex-1 rounded-lg bg-red-500/10 border border-red-500/20 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Del
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
