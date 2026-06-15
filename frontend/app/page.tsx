"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchEvents } from "@/lib/api";
import type { Event } from "@/lib/types";
import { EventCard } from "@/components/EventCard";

const CATEGORY_TABS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "football", label: "Football" },
  { key: "basketball", label: "Basketball" },
  { key: "tennis", label: "Tennis" },
  { key: "athletics", label: "Athletics" },
  { key: "cricket", label: "Cricket" },
  { key: "boxing", label: "Boxing" },
  { key: "american_football", label: "American Football" },
  { key: "other", label: "Other" },
];

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async (cat?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEvents(cat || undefined);
      setEvents(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents(category);
  }, [category, loadEvents]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Step into historic{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            sports moments
          </span>
        </h1>
        <p className="mt-3 text-sm text-gray-400 max-w-md mx-auto">
          Upload a selfie and see yourself at the greatest games ever played.
          Free. No sign-up needed to browse.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6 no-scrollbar">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCategory(tab.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              category === tab.key
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "bg-white/5 text-gray-400 border border-white/10 hover:text-white hover:bg-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Event Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-gray-900/60 animate-pulse">
              <div className="aspect-[4/3] bg-gray-800 rounded-t-2xl" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-800 rounded w-1/2" />
                <div className="h-4 bg-gray-800 rounded w-full" />
                <div className="h-3 bg-gray-800 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => loadEvents(category)}
            className="mt-3 text-sm text-cyan-400 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-5xl">🏟️</span>
          <p className="mt-4 text-gray-400 text-sm">No events found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      <footer className="mt-12 text-center">
        <a href="/privacy" className="text-xs text-gray-500 hover:text-gray-400 underline">
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}
