"use client";

import Link from "next/link";
import type { Event } from "@/lib/types";

const CATEGORY_ICON: Record<string, string> = {
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
  const categoryIcon = CATEGORY_ICON[event.category] || "🏟️";
  const timePeriod = event.scene?.time_period || "";
  const momentDesc = event.scene?.description || "";

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
            {categoryIcon}
          </div>
        )}
        {/* Year Badge */}
        {timePeriod && (
          <div className="absolute top-3 left-3 rounded-lg bg-black/70 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-gray-900 dark:text-white">
            {timePeriod}
          </div>
        )}
        {/* Category Badge */}
        <div className="absolute top-3 right-3 rounded-lg bg-black/70 backdrop-blur-sm px-2 py-1 text-xs text-white capitalize">
          {categoryIcon} {event.category.replace("_", " ")}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-cyan-400 font-medium capitalize">
            {event.category.replace("_", " ")}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors">
          {event.title}
        </h3>
        {momentDesc && (
          <p className="mt-1.5 text-xs text-gray-400 line-clamp-1">
            {momentDesc}
          </p>
        )}
      </div>
    </Link>
  );
}
