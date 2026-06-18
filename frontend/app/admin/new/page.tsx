"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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

export default function AdminNewPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  const eventId = useMemo(() => crypto.randomUUID(), []);

  const handleSave = async (data: EventFormSaveData) => {
    const uploads: Promise<void>[] = [];
    if (data.thumbnailFile) uploads.push(uploadFile(data.thumbnailFile, eventId, 'thumbnail', accessToken));
    if (data.backgroundFile) uploads.push(uploadFile(data.backgroundFile, eventId, 'background', accessToken));
    if (data.videoFile) uploads.push(uploadFile(data.videoFile, eventId, 'reference', accessToken));
    await Promise.all(uploads);

    await adminFetch("/admin/events", accessToken, {
      method: "POST",
      body: JSON.stringify({ ...data.body, id: eventId }),
    });
    router.push("/admin");
  };

  return (
    <AuthGuard>
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">⚙️ New Event</h1>
        </div>
        <EventForm onSave={handleSave} onCancel={() => router.push("/admin")} />
      </div>
    </AuthGuard>
  );
}
