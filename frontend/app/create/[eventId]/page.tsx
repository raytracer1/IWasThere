"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { fetchEvent, uploadSelfie, triggerGenerate } from "@/lib/api";
import type { Event, UploadResponse } from "@/lib/types";
import { UploadSelfie } from "@/components/UploadSelfie";

export default function CreatePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchEvent(eventId);
        if (res.data) setEvent(res.data);
        else setError("Event not found");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId]);

  const handleSelfieUpload = async (file: File) => {
    setSelfieFile(file);
    setUploading(true);
    setGenError(null);
    try {
      const res = await uploadSelfie(file);
      if (res.data) setUploadResult(res.data);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!uploadResult) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await triggerGenerate({
        eventId,
        imageKey: uploadResult.key,
      });
      if (res.data?.generationId) {
        router.push(`/result/${res.data.generationId}`);
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 bg-gray-800 rounded w-3/4" />
        <div className="aspect-video bg-gray-800 rounded-xl" />
        <div className="h-4 bg-gray-800 rounded w-full" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <span className="text-5xl">😔</span>
        <p className="mt-4 text-gray-400">{error || "Event not found"}</p>
        <button onClick={() => router.push("/")} className="mt-3 text-sm text-cyan-400 hover:underline">
          Back to events
        </button>
      </div>
    );
  }

  const SPORT_ICON: Record<string, string> = {
    football: "⚽", basketball: "🏀", tennis: "🎾", athletics: "🏃",
    cricket: "🏏", boxing: "🥊", american_football: "🏈", other: "🏟️",
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-20">
      {/* Event Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-xs text-cyan-300 mb-3">
          {SPORT_ICON[event.sportType] || ""} {event.sportType.replace("_", " ")} · {event.year}
        </div>
        <h1 className="text-xl font-bold text-white">{event.title}</h1>
        {event.location && (
          <p className="text-sm text-gray-400 mt-1">📍 {event.location}</p>
        )}
        {event.keyMoment && (
          <div className="mt-4 rounded-xl bg-gray-900/60 border border-white/10 p-4 text-left">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">The Moment</p>
            <p className="text-sm text-gray-200 leading-relaxed">{event.keyMoment}</p>
          </div>
        )}
      </div>

      {/* Selfie Upload */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">
          📸 Upload your selfie
        </h2>
        <UploadSelfie
          onUpload={handleSelfieUpload}
          uploading={uploading}
        />
        {uploadResult && !uploading && (
          <p className="mt-2 text-xs text-green-400">✅ Photo ready</p>
        )}
      </div>

      {/* Error */}
      {genError && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {genError}
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!uploadResult || generating}
        className={`w-full rounded-xl py-3.5 text-sm font-bold transition-all ${
          uploadResult && !generating
            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 shadow-lg shadow-cyan-500/25"
            : "bg-gray-800 text-gray-500 cursor-not-allowed"
        }`}
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            Generating...
          </span>
        ) : uploadResult ? (
          `⚡ Step Into ${event.year}`
        ) : (
          "Upload a selfie to continue"
        )}
      </button>
    </div>
  );
}
