"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/useAppSession";
import { useRouter } from "next/navigation";
import { EventCard } from "@/components/EventCard";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchEvents } from "@/lib/api";
import type { Event } from "@/lib/types";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "sports", label: "Sports" },
  { value: "music", label: "Music" },
  { value: "movies", label: "Movies" },
  { value: "news", label: "News" },
  { value: "other", label: "Other" },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    setLoading(true);
    setError(null);

    fetchEvents(category || undefined)
      .then((res) => {
        if (res.success) {
          setEvents(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch events:", err);
        setError("Failed to load events. The API might not be running yet.");
      })
      .finally(() => setLoading(false));
  }, [category, status]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <Skeleton className="mb-8 h-8 w-48" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🔥 Trending Hot Events</h1>
        <p className="mt-2 text-gray-400">
          Choose a trending event and put yourself in the moment with AI.
        </p>
      </div>

      <Tabs
        value={category}
        onValueChange={setCategory}
        items={CATEGORIES}
        className="mb-8"
      />

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">{error}</p>
          <p className="mt-2 text-sm text-gray-400">
            Make sure the Cloudflare Worker is running on{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5">
              {process.env.NEXT_PUBLIC_WORKER_URL ?? "http://localhost:8787"}
            </code>
          </p>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-6xl">📭</span>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No events yet</h3>
          <p className="mt-1 text-gray-400">
            Check back soon for trending hot events, or visit the admin panel to add some.
          </p>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
