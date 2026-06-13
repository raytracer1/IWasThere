"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { fetchGeneration } from "@/lib/api";
import type { Generation } from "@/lib/types";
import { CaptionPicker } from "@/components/CaptionPicker";
import { POLL_INTERVAL_MS } from "@/lib/types";

export default function ResultPage({
  params,
}: {
  params: Promise<{ generationId: string }>;
}) {
  const { generationId } = use(params);
  const router = useRouter();
  const [gen, setGen] = useState<Generation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCaption, setSelectedCaption] = useState<string | undefined>();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    let stopped = false;

    async function poll() {
      try {
        const res = await fetchGeneration(generationId);
        if (stopped) return;
        if (res.data) {
          setGen(res.data);
          if (res.data.status === "completed" || res.data.status === "failed") {
            clearInterval(timer);
          }
        }
      } catch (err) {
        if (!stopped) {
          setError(err instanceof Error ? err.message : "Failed to load");
          clearInterval(timer);
        }
      }
    }

    poll();
    timer = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [generationId]);

  if (error && !gen) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <span className="text-5xl">😔</span>
        <p className="mt-4 text-red-400 text-sm">{error}</p>
        <button onClick={() => router.push("/")} className="mt-3 text-sm text-cyan-400 hover:underline">
          Back to events
        </button>
      </div>
    );
  }

  const isProcessing = !gen || gen.status === "queued" || gen.status === "processing";
  const isCompleted = gen?.status === "completed";
  const isFailed = gen?.status === "failed";

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-20">
      {/* Processing State */}
      {isProcessing && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
            <span className="text-3xl animate-pulse">⚡</span>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">
            Transporting you to history...
          </h2>
          <p className="text-sm text-gray-400">
            AI is placing you into the moment. This usually takes 10-20 seconds.
          </p>
          <div className="mt-6 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Failed State */}
      {isFailed && (
        <div className="text-center py-16">
          <span className="text-5xl">😔</span>
          <h2 className="mt-4 text-lg font-semibold text-white">Generation failed</h2>
          <p className="mt-2 text-sm text-gray-400">
            {gen?.errorMessage || "Something went wrong. Try a different selfie or event."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 text-sm text-cyan-400 hover:underline"
          >
            Try another event
          </button>
        </div>
      )}

      {/* Completed State */}
      {isCompleted && gen && (
        <div className="space-y-6">
          {/* Generated Image */}
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-gray-900/60">
            {gen.outputImageUrl ? (
              <img
                src={gen.outputImageUrl}
                alt="Your AI-generated sports moment"
                className="w-full h-auto"
              />
            ) : (
              <div className="aspect-[4/3] flex items-center justify-center text-gray-500">
                No image available
              </div>
            )}
          </div>

          {/* Event Info */}
          <div className="text-center">
            <p className="text-xs text-cyan-400 uppercase tracking-wide">
              Step into historic sports moments
            </p>
            <h2 className="text-lg font-bold text-white mt-1">{gen.eventTitle || "Historic Moment"}</h2>
          </div>

          {/* Captions */}
          {gen.captions && gen.captions.length > 0 && (
            <CaptionPicker
              captions={gen.captions}
              onSelect={setSelectedCaption}
              selected={selectedCaption}
            />
          )}

          {/* Share / Download */}
          <div className="space-y-3">
            {gen.outputImageUrl && (
              <a
                href={gen.outputImageUrl}
                download={`ifiwasthere-${gen.eventId}.png`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center rounded-xl bg-white/10 border border-white/10 py-3 text-sm font-medium text-white hover:bg-white/20 transition-colors"
              >
                📥 Download Image
              </a>
            )}

            {selectedCaption && (
              <button
                onClick={() => {
                  const text = encodeURIComponent(selectedCaption);
                  window.open(`https://x.com/intent/tweet?text=${text}`, "_blank");
                }}
                className="block w-full text-center rounded-xl bg-black border border-white/20 py-3 text-sm font-medium text-white hover:bg-gray-900 transition-colors"
              >
                🐦 Share on X
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => router.push("/")}
                className="flex-1 rounded-xl bg-gray-800 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
              >
                New Event
              </button>
              <button
                onClick={() => router.push("/history")}
                className="flex-1 rounded-xl bg-gray-800 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
              >
                My History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
