"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Event, EventCategory, EventStatus } from "@/lib/types";
import { EVENT_CATEGORIES } from "@/lib/types";
import { createEvent, updateEventMultipart } from "@/lib/api";
import { compressVideo } from "@/lib/videoCompress";
import VideoTrimmer, { type VideoTrimmerHandle } from "@/components/VideoTrimmer";

interface EventFormProps {
  event?: Event;
  initialVideo?: File | null;
  initialThumbnail?: File | null;
}

export function EventForm({ event, initialVideo, initialThumbnail }: EventFormProps) {
  const router = useRouter();
  const isEdit = !!event;

  const [title, setTitle] = useState(event?.title ?? "");
  const [category, setCategory] = useState<EventCategory>(event?.category ?? "other");
  const [description, setDescription] = useState(event?.description ?? "");
  const [status, setStatus] = useState<EventStatus>(event?.status ?? "draft");
  const [price, setPrice] = useState(event?.price?.toString() ?? "");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [compressedVideo, setCompressedVideo] = useState<Blob | null>(null);
  const trimmerRef = useRef<VideoTrimmerHandle>(null);
  const [compressMsg, setCompressMsg] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbPreviewUrl, setThumbPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRanges, setHasRanges] = useState(false);

  const canSubmit = !!title.trim() && !!compressedVideo && !!thumbnailFile && !!price && parseFloat(price) >= 0.50 && hasRanges;

  async function handleVideoChange(file: File | null) {
    setCompressedVideo(null);
    setCompressMsg(null);
    setVideoFile(file);
    if (!file) return;

    try {
      const result = await compressVideo(file, (msg) => setCompressMsg(msg));
      setCompressedVideo(result.blob);
    } catch (err) {
      setCompressMsg("Compression failed, will upload original");
      setCompressedVideo(file);
    }
  }

  // Parse saved trim ranges from event
  const savedRanges = event?.trimRanges ? (() => {
    try { return JSON.parse(event.trimRanges) as { startFrame: number; endFrame: number }[]; } catch { return undefined; }
  })() : undefined;

  // Auto-load initial video/thumbnail for edit mode (no re-compression)
  useEffect(() => {
    if (initialVideo) {
      setVideoFile(initialVideo);
      setCompressedVideo(initialVideo);
      setCompressMsg("Using existing video");
    }
    if (initialThumbnail) {
      setThumbnailFile(initialThumbnail);
      setThumbPreviewUrl(URL.createObjectURL(initialThumbnail));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVideo, initialThumbnail]);

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
      formData.append("price", price || "0.50");
      formData.append("status", status);

      // Send trimRanges if set, upload compressed video as single file
      const ranges = trimmerRef.current?.getRanges();
      if (ranges && ranges.length > 0) {
        formData.append("trimRanges", JSON.stringify(ranges));
      }
      if (compressedVideo) {
        const origName = videoFile?.name ?? "video.mp4";
        const baseName = origName.includes(".") ? origName.substring(0, origName.lastIndexOf(".")) : origName;
        formData.append("video", new File([compressedVideo], `${baseName}.mp4`, { type: compressedVideo.type }));
      } else if (videoFile) {
        formData.append("video", videoFile);
      }
      if (thumbnailFile) formData.append("thumbnail", thumbnailFile);

      if (isEdit) {
        const res = await updateEventMultipart(event!.id, formData);
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
      {/* Video Upload */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {isEdit ? "Replace Video (optional)" : "Video File *"}
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => handleVideoChange(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-purple-600 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-purple-700"
          />
          {compressMsg && (
            <p className="mt-1 text-xs text-blue-400">{compressMsg}</p>
          )}
          {/* Trimmer: shows after compression, uses H.264 MP4 (plays in all browsers) */}
          {compressedVideo && (
            <div className="mt-4 rounded-lg border border-gray-200 dark:border-white/10 p-4">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                ✂️ Trim Video (optional)
              </p>
              <VideoTrimmer
                ref={trimmerRef}
                blob={compressedVideo}
                type="video/mp4"
                initialRanges={savedRanges}
                onRangesChange={(r) => setHasRanges(r.length > 0)}
                onThumbnailCapture={(blob) => {
                  const f = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
                  setThumbnailFile(f);
                  setThumbPreviewUrl(URL.createObjectURL(blob));
                }}
              />
            </div>
          )}
          {!compressedVideo && videoFile && compressMsg && (
            <p className="text-sm text-yellow-400">⏳ {compressMsg}</p>
          )}
        </div>

        {/* Thumbnail Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {isEdit ? "Replace Thumbnail (optional)" : "Thumbnail Image"}
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setThumbnailFile(f);
              if (f) setThumbPreviewUrl(URL.createObjectURL(f));
            }}
            className="w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-purple-600 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-purple-700"
          />
          {thumbPreviewUrl && (
            <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10">
              <img src={thumbPreviewUrl} alt="thumbnail" className="w-full max-h-32 object-contain" />
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:border-purple-500 focus:outline-none"
          placeholder="e.g., World Cup 2026 Final Goal"
          required
        />
      </div>

      {/* Category + Price + Status */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
            className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none"
          >
            {EVENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Price (USD) *
          </label>
          <input
            type="number"
            min="0.50"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none"
            placeholder="0.50"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as EventStatus)}
            className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="draft" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Draft</option>
            <option value="active" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Active</option>
            <option value="archived" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Archived</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:border-purple-500 focus:outline-none"
          placeholder="Brief description of the event..."
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Validation */}
      {!canSubmit && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm space-y-1">
          <p className="font-medium text-yellow-400">⚠️ Required:</p>
          {!title.trim() && <p className="text-yellow-300/70">• Enter a title</p>}
          {(!price || parseFloat(price) < 0.50) && <p className="text-yellow-300/70">• Set a price (min $0.50)</p>}
          {!compressedVideo && <p className="text-yellow-300/70">• Upload a video</p>}
          {!thumbnailFile && <p className="text-yellow-300/70">• Upload or capture a thumbnail</p>}
          {!hasRanges && <p className="text-yellow-300/70">• Set at least one In/Out range</p>}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4">
        <Button type="submit" disabled={submitting || !canSubmit} size="lg">
          {submitting ? "Saving..." : isEdit ? "Update Event" : "Create Event"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <div className="flex-1" />
        {isEdit && (
          <Button type="button" variant="destructive" size="lg" onClick={handleDelete}>
            Delete Event
          </Button>
        )}
      </div>
    </form>
  );
}
