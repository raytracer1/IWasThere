"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAdminEvents, deleteEvent } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Event } from "@/lib/types";

export default function AdminPage() {
  const { status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    loadEvents();
  }, [status, router]);

  async function loadEvents() {
    setLoading(true);
    try {
      const res = await fetchAdminEvents();
      if (res.success) {
        setEvents(res.data);
      } else {
        setError("Failed to load events. Check admin permissions.");
      }
    } catch (err) {
      console.error("Admin API error:", err);
      setError(err instanceof Error ? err.message : "Admin API not available. Check your permissions.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Are you sure? This also deletes the R2 files.")) return;
    try {
      await deleteEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      setError("Failed to delete event");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Skeleton className="mb-8 h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <p className="mt-1 text-gray-400">Manage hot events</p>
        </div>
        <Link href="/admin/events/new">
          <Button size="lg">+ New Event</Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-6xl">📋</span>
          <h3 className="mt-4 text-lg font-medium text-white">No events yet</h3>
          <p className="mt-1 text-gray-400">Create your first event to get started.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 hidden sm:table-cell">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 hidden md:table-cell">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 hidden lg:table-cell">Created</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white line-clamp-1">{event.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{event.id}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant={event.category}>{event.category}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant={event.status === "active" ? "completed" : event.status === "draft" ? "queued" : "failed"}>
                      {event.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 hidden lg:table-cell">
                    {formatDate(event.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/events/${event.id}/edit`}>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => handleDelete(event.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
