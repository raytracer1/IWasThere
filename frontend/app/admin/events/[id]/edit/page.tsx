"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "@/lib/useAppSession";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/EventForm";
import { fetchEvent } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import type { Event } from "@/lib/types";

async function downloadAsFile(url: string, name: string): Promise<File | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new File([blob], name, { type: blob.type });
  } catch {
    return null;
  }
}

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [initialVideo, setInitialVideo] = useState<File | null>(null);
  const [initialThumb, setInitialThumb] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;

    fetchEvent(id).then(async (res) => {
      if (res.success && res.data) {
        setEvent(res.data);
        // Download existing assets
        const [video, thumb] = await Promise.all([
          downloadAsFile(res.data.videoUrl, "current.mp4"),
          res.data.thumbnailUrl ? downloadAsFile(res.data.thumbnailUrl, "thumbnail.jpg") : Promise.resolve(null),
        ]);
        setInitialVideo(video);
        setInitialThumb(thumb);
      }
      setLoading(false);
    });
  }, [id, status, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-4">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-4 text-center">
        <p className="text-gray-400">Event not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <h1 className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-white">Edit Event</h1>
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6">
        <EventForm event={event} initialVideo={initialVideo} initialThumbnail={initialThumb} />
      </div>
    </div>
  );
}
