"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Event } from "@/lib/types";
import AuthGuard from "@/components/admin/AuthGuard";
import EventForm, { type EventFormSaveData } from "@/components/admin/EventForm";
import { adminFetch } from "@/lib/admin-api";
import { compressToWebP } from "@/lib/image-utils";

async function uploadFile(file: File, eventId: string, name: string, token?: string): Promise<void> {
  let uploadFile = file;
  if (file.type.startsWith('image/')) {
    uploadFile = await compressToWebP(file);
  }
  const fd = new FormData();
  fd.append("file", uploadFile);
  await adminFetch(`/admin/upload?eventId=${eventId}&name=${name}`, token, { method: "POST", body: fd });
}

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
        if (res.data) setEvent(res.data);
        else setError("Event not found");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load event");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId, accessToken]);

  const handleSave = async (data: EventFormSaveData) => {
    const uploads: Promise<void>[] = [];
    if (data.thumbnailFile) uploads.push(uploadFile(data.thumbnailFile, eventId, 'thumbnail', accessToken));
    if (data.backgroundFile) uploads.push(uploadFile(data.backgroundFile, eventId, 'background', accessToken));
    if (data.videoFile) uploads.push(uploadFile(data.videoFile, eventId, 'reference', accessToken));
    await Promise.all(uploads);

    // Step 2: PUT event JSON
    await adminFetch(`/admin/events/${eventId}`, accessToken, {
      method: "PUT",
      body: JSON.stringify(data.body),
    });
    router.push("/admin");
  };

  return (
    <AuthGuard>
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">⚙️ Edit Event</h1>
        </div>
        {loading ? (
          <div className="rounded-xl border border-white/10 bg-gray-900/60 p-8 text-center">
            <p className="text-gray-400">Loading event...</p>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-white/10 bg-gray-900/60 p-8 text-center">
            <p className="text-red-400">{error}</p>
            <button onClick={() => router.push("/admin")} className="mt-3 text-sm text-cyan-400 hover:underline">
              Back to admin
            </button>
          </div>
        ) : event ? (
          <EventForm
            event={event}
            onSave={handleSave}
            onCancel={() => router.push("/admin")}
            onGenerateAssets={async (data) => {
              await adminFetch(`/admin/events/${eventId}/generate-assets`, accessToken, {
                method: 'POST',
                body: JSON.stringify(data),
              });
              // Poll until video is ready (blocking — button shows "Generating...")
              let seenTask = false;
              await new Promise<void>((resolve) => {
                (function poll() {
                  setTimeout(async () => {
                    const r = await adminFetch<{ data: Event & { pendingVideoTask?: string } }>(`/admin/events/${eventId}`, accessToken);
                    if (r.data) { setEvent(r.data); if (r.data.pendingVideoTask) seenTask = true; }
                    if (!seenTask) poll();
                    else if (r.data?.pendingVideoTask) poll();
                    else resolve();
                  }, 5000);
                })();
              });
            }}
          />
        ) : null}
      </div>
    </AuthGuard>
  );
}
