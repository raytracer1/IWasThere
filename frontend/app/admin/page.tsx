"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
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
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">⚙️ Event Admin</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{session?.user?.email}</span>
            <button onClick={() => signOut()} className="text-xs text-red-400 hover:underline">
              Sign out
            </button>
          </div>
        </div>

        {/* New Event Button */}
        <button
          onClick={() => router.push("/admin/new")}
          className="mb-6 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 transition-colors"
        >
          + New Event
        </button>

        {/* Event List */}
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-gray-900/60 p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{ev.title}</p>
                  <p className="text-xs text-gray-400">
                    {ev.category} · {ev.event_type || ""} · {ev.scene?.time_period || ""} ·{" "}
                    <span
                      className={
                        ev.status === "active" ? "text-green-400" : "text-yellow-400"
                      }
                    >
                      {ev.status}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/admin/${ev.id}`)}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(ev.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Del
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
