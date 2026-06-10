"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/useAppSession";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadSelfie } from "@/components/UploadSelfie";
import { fetchEvent, uploadSelfie, triggerSwap } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import type { Event } from "@/lib/types";

export default function CreatePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload + Generate state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const authenticated = status === "authenticated";
  const userCredits = (session?.user as { credits?: number } | undefined)?.credits ?? 0;
  const priceInsufficient = authenticated && (event?.price ?? 0) > userCredits;

  useEffect(() => {
    if (status === "loading") return;

    setLoading(true);
    fetchEvent(eventId)
      .then((res) => {
        if (res.success && res.data) {
          setEvent(res.data);
        } else {
          setError("Event not found");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch event:", err);
        setError("Failed to load event");
      })
      .finally(() => setLoading(false));
  }, [eventId, status]);

  const handleGenerate = async () => {
    if (!selectedFile || !event) return;

    setGenerateError(null);
    setUploading(true);

    try {
      // 1. Upload selfie to R2
      const uploadRes = await uploadSelfie(selectedFile);
      if (!uploadRes.success || !uploadRes.data) {
        throw new Error(uploadRes.error ?? "Upload failed");
      }

      setUploading(false);
      setGenerating(true);

      // 2. Trigger swap job
      const swapRes = await triggerSwap({
        eventId: event.id,
        imageKey: uploadRes.data.key,
      });

      if (!swapRes.success || !swapRes.data) {
        throw new Error(swapRes.error ?? "Generation failed");
      }

      // 3. Refresh session so credits update in Navbar
      await update();

      // 4. Redirect to result page
      router.push(`/result/${swapRes.data.jobId}`);
    } catch (err) {
      setUploading(false);
      setGenerating(false);
      setGenerateError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="aspect-video w-full rounded-xl" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <span className="text-6xl">🔍</span>
        <p className="mt-4 text-lg text-gray-400">{error ?? "Event not found"}</p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="mb-6 text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back
      </button>

      {/* Event Info */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        {/* Video Player */}
        <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-800">
          {(event.originalVideoUrl || event.videoUrl) ? (
            <video
              src={event.originalVideoUrl || event.videoUrl}
              poster={event.thumbnailUrl}
              controls
              preload="metadata"
              className="h-full w-full object-contain"
            />
          ) : event.thumbnailUrl ? (
            <Image
              src={event.thumbnailUrl}
              alt={event.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl">🎬</div>
          )}
          {event.duration && (
            <div className="absolute right-3 bottom-3 rounded-md bg-black/70 px-2 py-0.5 text-xs text-white">
              {formatDuration(event.duration)}
            </div>
          )}
        </div>

        {/* Event Details */}
        <div className="flex flex-col justify-center">
          <div className="mb-3">
            <Badge variant={event.category}>{event.category}</Badge>
          </div>
          <h1 className="text-2xl font-bold text-white">{event.title}</h1>
          {event.description && (
            <p className="mt-2 text-gray-400">{event.description}</p>
          )}
          <p className="mt-4 text-sm text-gray-500">
            Upload your selfie and AI will insert you into this video.
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Your Selfie</h2>

        <UploadSelfie
          onUpload={setSelectedFile}
          uploading={uploading}
        />

        {generateError && (
          <p className="mt-4 text-sm text-red-400">{generateError}</p>
        )}

        <div className="mt-6">
          <Button
            size="lg"
            className="w-full"
            disabled={!authenticated || !selectedFile || uploading || generating || priceInsufficient}
            onClick={handleGenerate}
          >
            {!authenticated ? (
              "🔒 Login to Generate"
            ) : generating ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Generating...
              </span>
            ) : uploading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span> Uploading...
              </span>
            ) : (
              "✨ Generate My Video"
            )}
          </Button>
          {!authenticated && (
            <p className="mt-2 text-center text-sm text-gray-400">
              <button onClick={() => router.push("/login")} className="text-purple-400 hover:underline">Sign in</button> to generate your video.
            </p>
          )}
          {priceInsufficient && (
            <p className="mt-2 text-center text-sm text-red-400">
              Insufficient credits. Need {event?.price ?? 0} 💎, you have {userCredits} 💎.
            </p>
          )}
          <p className="mt-2 text-center text-xs text-gray-500">
            {event?.price ?? "?"} 💎 per generation · {userCredits} 💎 available
          </p>
        </div>
      </div>
    </div>
  );
}
