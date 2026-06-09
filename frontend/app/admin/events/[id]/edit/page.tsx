"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "@/lib/useAppSession";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/EventForm";
import { fetchEvent } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import type { Event } from "@/lib/types";

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    fetchEvent(id)
      .then((res) => {
        if (res.success && res.data) {
          setEvent(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, [id, status, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-0">
        <Skeleton className="mb-1 h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-00 text-center">
        <p className="text-gray-400">Event not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-0">
      <h1 className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-white">Edit Event</h1>
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <EventForm event={event} />
      </div>
    </div>
  );
}
