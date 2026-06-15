"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/admin/AuthGuard";
import EventForm, { type EventFormSaveData } from "@/components/admin/EventForm";
import { adminFetch } from "@/lib/admin-api";

export default function AdminNewPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;

  const handleSave = async (data: EventFormSaveData) => {
    if (data.thumbnailFile || data.backgroundFile) {
      const fd = new FormData();
      if (data.thumbnailFile) fd.append("thumbnail", data.thumbnailFile);
      if (data.backgroundFile) fd.append("background", data.backgroundFile);
      fd.append("metadata", JSON.stringify(data.body));
      await adminFetch("/admin/events", accessToken, {
        method: "POST",
        body: fd,
      });
    } else {
      await adminFetch("/admin/events", accessToken, {
        method: "POST",
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
          <h1 className="text-xl font-bold text-white">⚙️ New Event</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{session?.user?.email}</span>
            <button onClick={() => signOut()} className="text-xs text-red-400 hover:underline">
              Sign out
            </button>
          </div>
        </div>
        <EventForm onSave={handleSave} onCancel={handleCancel} />
      </div>
    </AuthGuard>
  );
}
