"use client";

import { useState, useEffect, use } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Event } from "@/lib/types";
import AuthGuard from "@/components/admin/AuthGuard";
import EventForm, { type EventFormSaveData } from "@/components/admin/EventForm";
import { adminFetch } from "@/lib/admin-api";

export default function AdminEditPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    async function load() {
      setLoading(true);
      try {
        const res = await adminFetch<{ success: boolean; data: Event }>(
          `/admin/events/${eventId}`,
          accessToken
        );
        if (res.data) {
          setEvent(res.data);
        } else {
          setError("Event not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, accessToken]);

  const handleSave = async (data: EventFormSaveData) => {
    if (data.thumbnailFile) {
      const fd = new FormData();
      fd.append("thumbnail", data.thumbnailFile);
      fd.append("metadata", JSON.stringify(data.body));
      await adminFetch(`/admin/events/${eventId}`, accessToken, {
        method: "PUT",
        body: fd,
      });
    } else {
      await adminFetch(`/admin/events/${eventId}`, accessToken, {
        method: "PUT",
        body: JSON.stringify(data.body),
      });
    }
    router.push("/admin");
  };

  const handleCancel = () => {
    router.push("/admin");
  };

  return (
    <AuthGuard>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">⚙️ Edit Event</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{session?.user?.email}</span>
            <button onClick={() => signOut()} className="text-xs text-red-400 hover:underline">
              Sign out
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-white/10 bg-gray-900/60 p-8 text-center">
            <p className="text-gray-400">Loading event...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-white/10 bg-gray-900/60 p-8 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => router.push("/admin")}
              className="mt-3 text-sm text-cyan-400 hover:underline"
            >
              Back to admin
            </button>
          </div>
        ) : event ? (
          <EventForm event={event} onSave={handleSave} onCancel={handleCancel} />
        ) : null}
      </div>
    </AuthGuard>
  );
}
