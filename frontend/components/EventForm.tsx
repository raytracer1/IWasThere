"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Event, EventCategory, EventStatus } from "@hotinsert/shared";
import { EVENT_CATEGORIES } from "@hotinsert/shared";
import { createEvent, updateEvent } from "@/lib/api";

interface EventFormProps {
  event?: Event; // If provided, this is edit mode
}

export function EventForm({ event }: EventFormProps) {
  const router = useRouter();
  const isEdit = !!event;

  const [title, setTitle] = useState(event?.title ?? "");
  const [category, setCategory] = useState<EventCategory>(event?.category ?? "other");
  const [description, setDescription] = useState(event?.description ?? "");
  const [duration, setDuration] = useState(event?.duration?.toString() ?? "");
  const [status, setStatus] = useState<EventStatus>(event?.status ?? "draft");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("category", category);
      if (description.trim()) formData.append("description", description.trim());
      if (duration) formData.append("duration", duration);
      formData.append("status", status);

      if (videoFile) formData.append("video", videoFile);
      if (thumbnailFile) formData.append("thumbnail", thumbnailFile);

      if (isEdit) {
        const res = await updateEvent(event!.id, {
          title: title.trim(),
          category,
          description: description.trim() || undefined,
          duration: duration ? parseInt(duration, 10) : undefined,
          status,
        });
        if (!res.success) throw new Error(res.error);
      } else {
        const res = await createEvent(formData);
        if (!res.success) throw new Error(res.error);
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !confirm("Are you sure you want to delete this event?")) return;

    try {
      const { deleteEvent: del } = await import("@/lib/api");
      const res = await del(event.id);
      if (!res.success) throw new Error(res.error);
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
          placeholder="e.g., World Cup 2026 Final Goal"
          required
        />
      </div>

      {/* Category + Status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
          >
            {EVENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-gray-900">
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as EventStatus)}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="draft" className="bg-gray-900">Draft</option>
            <option value="active" className="bg-gray-900">Active</option>
            <option value="archived" className="bg-gray-900">Archived</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
          placeholder="Brief description of the event..."
        />
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Duration (seconds)
        </label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
          placeholder="e.g., 30"
        />
      </div>

      {/* Files */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {isEdit ? "Replace Video (optional)" : "Video File *"}
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-purple-600 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-purple-700"
          />
          {isEdit && event?.videoUrl && (
            <p className="mt-1 text-xs text-gray-500">Current: {event.videoUrl}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {isEdit ? "Replace Thumbnail (optional)" : "Thumbnail Image"}
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-purple-600 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-purple-700"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4">
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? "Saving..." : isEdit ? "Update Event" : "Create Event"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <div className="flex-1" />
        {isEdit && (
          <Button type="button" variant="destructive" onClick={handleDelete}>
            Delete Event
          </Button>
        )}
      </div>
    </form>
  );
}
