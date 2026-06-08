"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Event } from "@/lib/types";
import { formatDuration } from "@/lib/format";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/create/${event.id}`}>
      <Card className="group overflow-hidden transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-gray-800">
          {event.thumbnailUrl ? (
            <Image
              src={event.thumbnailUrl}
              alt={event.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-600">
              <span className="text-4xl">🎬</span>
            </div>
          )}

          {/* Category badge overlay */}
          <div className="absolute left-3 top-3">
            <Badge variant={event.category}>{event.category}</Badge>
          </div>

          {/* Duration badge */}
          {event.duration && (
            <div className="absolute right-3 bottom-3 rounded-md bg-black/70 px-2 py-0.5 text-xs text-white">
              {formatDuration(event.duration)}
            </div>
          )}
        </div>

        <CardContent>
          <h3 className="font-semibold text-white line-clamp-1">{event.title}</h3>
          {event.description && (
            <p className="mt-1 text-sm text-gray-400 line-clamp-2">{event.description}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
