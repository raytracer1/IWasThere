"use client";

import { useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/admin/AuthGuard";
import EventForm, { type EventFormSaveData } from "@/components/admin/EventForm";
import { adminFetch } from "@/lib/admin-api";
import { compressToWebP } from "@/lib/image-utils";

function buildKey(ext: string, eventId: string, name: string): string {
  return `events/${eventId}/${name}.${ext}`;
}

async function uploadFile(file: File, eventId: string, name: string, token?: string): Promise<void> {
  // Compress images to WebP before upload
  let uploadFile = file;
  if (file.type.startsWith('image/') && file.type !== 'image/webp') {
    uploadFile = await compressToWebP(file);
  }
  const fd = new FormData();
  fd.append("file", uploadFile);
  await adminFetch(`/admin/upload?eventId=${eventId}&name=${name}`, token, { method: "POST", body: fd });
}

export default function AdminNewPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  const eventId = useMemo(() => crypto.randomUUID(), []);

  const handleSave = async (data: EventFormSaveData) => {
    // Step 1: Upload files (parallel), key is deterministic
    const uploads: Promise<void>[] = [];
    if (data.thumbnailFile) {
      data.body.thumbnailUrl = buildKey('webp', eventId, 'thumbnail');
      uploads.push(uploadFile(data.thumbnailFile, eventId, 'thumbnail', accessToken));
    }
    if (data.backgroundFile) {
      const gen = (data.body.generation as Record<string, unknown>) || {};
      gen.background_image = buildKey('webp', eventId, 'background');
      data.body.generation = gen;
      uploads.push(uploadFile(data.backgroundFile, eventId, 'background', accessToken));
    }
    if (data.videoFile) {
      data.body.referenceVideo = buildKey(data.videoFile.name.split('.').pop() || 'mp4', eventId, 'reference');
      uploads.push(uploadFile(data.videoFile, eventId, 'reference', accessToken));
    }
    await Promise.all(uploads);

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
