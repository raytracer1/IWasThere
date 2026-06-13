"use client";

import Link from "next/link";
import type { Event } from "@/lib/types";

function fireEmoji(viral: number): string {
  if (viral >= 9) return "🔥🔥🔥";
  if (viral >= 8) return "🔥🔥";
  if (viral >= 7) return "🔥";
  return "⭐";
}

const SPORT_ICON: Record<string, string> = {
  football: "⚽",
  basketball: "🏀",
  tennis: "🎾",
  athletics: "🏃",
  cricket: "🏏",
  boxing: "🥊",
  american_football: "🏈",
  other: "🏟️",
};

export function EventCard({ event }: { event: Event }) {
  return (
    <Link
      href={`/create/${event.id}`}
      className="group block rounded-2xl border border-white/10 bg-gray-900/60 backdrop-blur-sm overflow-hidden hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden">
        {event.thumbnailUrl ? (
          <img
            src={event.thumbnailUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-cyan-900/50 to-blue-900/50">
            {SPORT_ICON[event.sportType] || "🏟️"}
          </div>
        )}
        {/* Year Badge */}
        <div className="absolute top-3 left-3 rounded-lg bg-black/70 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-white">
          {event.year}
        </div>
        {/* Viral Badge */}
        <div className="absolute top-3 right-3 rounded-lg bg-black/70 backdrop-blur-sm px-2 py-1 text-xs">
          {fireEmoji(event.viralScore)} {event.viralScore}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-cyan-400 font-medium">
            {SPORT_ICON[event.sportType] || ""} {event.sportType.replace("_", " ")}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors">
          {event.title}
        </h3>
        {event.keyMoment && (
          <p className="mt-1.5 text-xs text-gray-400 line-clamp-1">
            {event.keyMoment}
          </p>
        )}
      </div>
    </Link>
  );
}
