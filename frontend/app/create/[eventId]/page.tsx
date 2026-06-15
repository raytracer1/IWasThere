"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { fetchEvent, triggerGenerate } from "@/lib/api";
import type { Event } from "@/lib/types";
import { UploadSelfie } from "@/components/UploadSelfie";

const CATEGORY_ICON: Record<string, string> = {
  football: "⚽", basketball: "🏀", tennis: "🎾", athletics: "🏃",
  cricket: "🏏", boxing: "🥊", american_football: "🏈", other: "🏟️",
};

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
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [generating, setGenerating] = useState(false);
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
    setConverting(true);
    setGenError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setSelfiePreview(reader.result as string);
      setImageBase64(reader.result as string);
      setConverting(false);
    };
    reader.onerror = () => { setGenError("Failed to read image"); setConverting(false); };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!imageBase64) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await triggerGenerate({ eventId, imageBase64 });
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

  const categoryIcon = CATEGORY_ICON[event.category] || "🏟️";
  const timePeriod = event.scene?.time_period || "";
  const location = event.scene?.location || "";
  const momentDesc = event.moment?.description || event.moment?.key_action || "";
  const atmosphere = event.scene?.atmosphere || "";

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-20">
      {/* Event Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-xs text-cyan-300 mb-3">
          {categoryIcon} {event.category.replace("_", " ")} · {timePeriod}
        </div>
        <h1 className="text-xl font-bold text-white">{event.title}</h1>
        {location && (
          <p className="text-sm text-gray-400 mt-1">📍 {location}</p>
        )}
        {momentDesc && (
          <div className="mt-4 rounded-xl bg-gray-900/60 border border-white/10 p-4 text-left">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">The Moment</p>
            <p className="text-sm text-gray-200 leading-relaxed">{momentDesc}</p>
            {atmosphere && (
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{atmosphere}</p>
            )}
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
          uploading={converting}
        />
        {selfiePreview && !converting && (
          <p className="mt-2 text-xs text-green-400">✅ Photo ready</p>
        )}
        {converting && (
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-cyan-400">
            <span className="animate-spin">⏳</span>
            Reading photo...
          </div>
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
        disabled={!imageBase64 || generating}
        className={`w-full rounded-xl py-3.5 text-sm font-bold transition-all ${
          imageBase64 && !generating
            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 shadow-lg shadow-cyan-500/25"
            : "bg-gray-800 text-gray-500 cursor-not-allowed"
        }`}
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span>
            Generating...
          </span>
        ) : imageBase64 ? (
          `⚡ Step Into ${timePeriod}`
        ) : (
          "Upload a selfie to continue"
        )}
      </button>
    </div>
  );
}
