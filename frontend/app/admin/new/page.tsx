"use client";

import { useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/admin/AuthGuard";
import EventForm, { type EventFormSaveData } from "@/components/admin/EventForm";
import { adminFetch } from "@/lib/admin-api";

async function uploadFile(file: File, eventId: string, name: string, token?: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await adminFetch<{ success: boolean; data: { key: string } }>(
    `/admin/upload?eventId=${eventId}&name=${name}`,
    token,
    { method: "POST", body: fd }
  );
  return res.data.key;
}

export default function AdminNewPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  const eventId = useMemo(() => crypto.randomUUID(), []);

  const handleSave = async (data: EventFormSaveData) => {
    // Step 1: Upload files, fill keys into body
    if (data.thumbnailFile) {
      data.body.thumbnailUrl = await uploadFile(data.thumbnailFile, eventId, "thumbnail", accessToken);
    }
    if (data.backgroundFile) {
      const gen = (data.body.generation as Record<string, unknown>) || {};
      gen.background_image = await uploadFile(data.backgroundFile, eventId, "background", accessToken);
      data.body.generation = gen;
    }
    if (data.videoFile) {
      data.body.referenceVideo = await uploadFile(data.videoFile, eventId, "reference", accessToken);
    }

    // Step 2: POST event JSON
    await adminFetch("/admin/events", accessToken, {
      method: "POST",
      body: JSON.stringify({ ...data.body, id: eventId }),
    });
    router.push("/admin");
  };

  return (
    <AuthGuard>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">⚙️ New Event</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{session?.user?.email}</span>
            <button onClick={() => signOut()} className="text-xs text-red-400 hover:underline">Sign out</button>
          </div>
        </div>
        <EventForm onSave={handleSave} onCancel={() => router.push("/admin")} />
      </div>
    </AuthGuard>
  );
}
