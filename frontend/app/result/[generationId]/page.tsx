"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { fetchGeneration } from "@/lib/api";
import type { Generation } from "@/lib/types";
import { CaptionPicker } from "@/components/CaptionPicker";
import { POLL_INTERVAL_MS } from "@/lib/types";

async function downloadWithWatermark(imageUrl: string, filename: string) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imageUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;

  // Draw image
  ctx.drawImage(img, 0, 0);

  // Draw watermark
  const fontSize = Math.max(14, img.naturalWidth / 40);
  ctx.font = `${fontSize}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.lineWidth = 3;
  const text = "AI-Generated";
  const metrics = ctx.measureText(text);
  const padding = fontSize;
  const x = canvas.width - metrics.width - padding;
  const y = canvas.height - padding;

  // Text
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);

  // Download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export default function ResultPage({
  params,
}: {
  params: Promise<{ generationId: string }>;
}) {
  const { generationId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;
  const [gen, setGen] = useState<Generation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCaption, setSelectedCaption] = useState<string | undefined>();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    let stopped = false;

    async function poll() {
      try {
        const res = await fetchGeneration(generationId, accessToken);
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
  }, [generationId, accessToken]);

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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Creating your video...
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
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">Generation failed</h2>
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
          {/* Generated Video / Image */}
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-gray-900/60 relative">
            {gen.outputVideoUrl ? (
              <>
                <video
                  src={gen.outputVideoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full max-h-[60vh] object-contain"
                />

                {/* TV Broadcast Scoreboard Overlay */}
                {(gen.football && gen.eventCategory === 'football') && (() => {
                const fb = JSON.parse(gen.football!);
                return (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    <span className="text-[10px] font-bold text-white truncate max-w-16">{fb.teamA}</span>
                    {fb.codeA && <img src={`https://flagcdn.com/w40/${fb.codeA}.png`} alt="" className="w-3.5 h-2.5 rounded-sm" />}
                    <span className="text-[10px] font-black text-white tabular-nums">{fb.score}</span>
                    {fb.codeB && <img src={`https://flagcdn.com/w40/${fb.codeB}.png`} alt="" className="w-3.5 h-2.5 rounded-sm" />}
                    <span className="text-[10px] font-bold text-white truncate max-w-16">{fb.teamB}</span>
                  </div>
                );
              })()}

                <div className="absolute top-3 left-3 text-[10px] text-white/70 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  IfIWasThere.AI
                </div>
              </>
            ) : gen.outputImageUrl ? (
              <>
                <img
                  src={gen.outputImageUrl}
                  alt="Your AI-generated sports moment"
                  className="w-full max-h-[60vh] object-contain"
                />
                {(gen.football && gen.eventCategory === 'football') && (() => {
                const fb = JSON.parse(gen.football!);
                return (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    <span className="text-[10px] font-bold text-white truncate max-w-16">{fb.teamA}</span>
                    {fb.codeA && <img src={`https://flagcdn.com/w40/${fb.codeA}.png`} alt="" className="w-3.5 h-2.5 rounded-sm" />}
                    <span className="text-[10px] font-black text-white tabular-nums">{fb.score}</span>
                    {fb.codeB && <img src={`https://flagcdn.com/w40/${fb.codeB}.png`} alt="" className="w-3.5 h-2.5 rounded-sm" />}
                    <span className="text-[10px] font-bold text-white truncate max-w-16">{fb.teamB}</span>
                  </div>
                );
              })()}
                <div className="absolute top-3 left-3 text-[10px] text-white/70 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  IfIWasThere.AI
                </div>
              </>
            ) : (
              <div className="aspect-[9/16] flex items-center justify-center text-gray-500">
                No media available
              </div>
            )}
          </div>

          {/* Event Info */}
          <div className="text-center">
            <p className="text-xs text-cyan-400 uppercase tracking-wide">
              Step into historic moments
            </p>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-1">{gen.eventTitle || "Historic Moment"}</h2>
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
            {(gen.outputVideoUrl || gen.outputImageUrl) && (
              <a
                href={gen.outputVideoUrl || gen.outputImageUrl}
                download={`ifiwasthere-${gen.eventId}.${gen.outputVideoUrl ? 'mp4' : 'png'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center rounded-xl bg-white/10 border border-white/10 py-3 text-sm font-medium text-gray-900 dark:text-white hover:bg-white/20 transition-colors"
              >
                📥 Download {gen.outputVideoUrl ? 'Video' : 'Image'}
              </a>
            )}

            {selectedCaption && (
              <button
                onClick={() => {
                  const text = encodeURIComponent(selectedCaption);
                  window.open(`https://x.com/intent/tweet?text=${text}`, "_blank");
                }}
                className="block w-full text-center rounded-xl bg-black border border-white/20 py-3 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-900 transition-colors"
              >
                🐦 Share on X
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => router.push("/")}
                className="w-full rounded-xl bg-gray-800 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
              >
                New Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
