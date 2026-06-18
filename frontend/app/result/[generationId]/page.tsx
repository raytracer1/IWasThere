"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { fetchGeneration } from "@/lib/api";
import type { Generation } from "@/lib/types";
import { CaptionPicker } from "@/components/CaptionPicker";
import { POLL_INTERVAL_MS } from "@/lib/types";

const WATERMARK = "IfIWasThere.AI";

const flagCache = new Map<string, HTMLImageElement>();

async function loadFlag(code: string): Promise<HTMLImageElement | null> {
  if (!code) return null;
  if (flagCache.has(code)) return flagCache.get(code)!;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `https://flagcdn.com/w80/${code}.png`;
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(); });
    flagCache.set(code, img);
    return img;
  } catch { return null; }
}

function drawWatermarks(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  football: { teamA: string; teamB: string; score: string; codeA?: string; codeB?: string } | null,
  flagA?: HTMLImageElement | null,
  flagB?: HTMLImageElement | null,
  matchSeconds = 0
) {
  const fontSize = Math.max(10, width / 60);

  // Top‑left: channel logo
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
  ctx.lineWidth = 1;
  ctx.strokeText(WATERMARK, 8, fontSize + 6);
  ctx.fillText(WATERMARK, 8, fontSize + 6);

  // Top‑right: scoreboard with flags
  if (football) {
    const scoreFontSize = Math.max(11, Math.round(width / 55));
    const teamFontSize = Math.max(9, Math.round(scoreFontSize * 0.85));
    const flgH = Math.round(scoreFontSize * 0.8);
    const flgW = Math.round(flgH * 1.6);
    const gap = Math.round(scoreFontSize * 0.3);
    const midY = 6 + scoreFontSize / 2;

    ctx.textBaseline = "middle";

    // Measure widths
    ctx.font = `bold ${teamFontSize}px system-ui, sans-serif`;
    const taW = ctx.measureText(football.teamA).width;
    ctx.font = `bold ${scoreFontSize}px system-ui, sans-serif`;
    const scW = ctx.measureText(football.score).width;
    ctx.font = `bold ${teamFontSize}px system-ui, sans-serif`;
    const tbW = ctx.measureText(football.teamB).width;

    // Clock width
    const clockFontSize = Math.max(9, Math.round(scoreFontSize * 0.85));
    ctx.font = `bold ${clockFontSize}px system-ui, monospace`;
    const mins = Math.floor(matchSeconds / 60);
    const secs = matchSeconds % 60;
    const clock = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const clkW = ctx.measureText(clock).width;

    const flagAW = flagA ? flgW + gap : 0;
    const flagBW = flagB ? flgW + gap : 0;
    const totalW = taW + gap + flagAW + scW + gap + flagBW + tbW + gap * 2 + clkW;
    let sx = width - totalW - 8;

    const drawText = (text: string, fontSize: number, x: number) => {
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 1;
      ctx.strokeText(text, x, midY);
      ctx.fillText(text, x, midY);
    };

    // Team A
    drawText(football.teamA, teamFontSize, sx);
    sx += taW + gap;

    // Flag A
    if (flagA) { ctx.drawImage(flagA, sx, midY - flgH / 2, flgW, flgH); sx += flgW + gap; }

    // Score
    drawText(football.score, scoreFontSize, sx);
    sx += scW + gap;

    // Flag B
    if (flagB) { ctx.drawImage(flagB, sx, midY - flgH / 2, flgW, flgH); sx += flgW + gap; }

    // Team B
    drawText(football.teamB, teamFontSize, sx);
    sx += tbW + gap * 2;

    // Match clock (pre-computed above)
    ctx.font = `bold ${clockFontSize}px system-ui, monospace`;
    ctx.fillStyle = "white";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 1;
    ctx.strokeText(clock, sx, midY);
    ctx.fillText(clock, sx, midY);

    ctx.textBaseline = "alphabetic";
  }
}

async function downloadImageWithWatermark(
  imageUrl: string, filename: string,
  football: { teamA: string; teamB: string; score: string; codeA?: string; codeB?: string } | null
) {
  const [img, flagA, flagB] = await Promise.all([
    new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image(); i.crossOrigin = "anonymous"; i.src = imageUrl;
      i.onload = () => resolve(i); i.onerror = () => reject(new Error("load failed"));
    }),
    loadFlag(football?.codeA || ''),
    loadFlag(football?.codeB || ''),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const matchTime = Math.floor(Math.random() * 90 * 60);
  drawWatermarks(ctx, canvas.width, canvas.height, football, flagA, flagB, matchTime);

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

async function downloadVideoWithWatermark(
  videoUrl: string, filename: string,
  football: { teamA: string; teamB: string; score: string; codeA?: string; codeB?: string } | null
) {
  const [flagA, flagB] = await Promise.all([
    loadFlag(football?.codeA || ''),
    loadFlag(football?.codeB || ''),
  ]);

  const proxyUrl = `/api/proxy?url=${encodeURIComponent(videoUrl)}`;
  const resp = await fetch(proxyUrl);
  const blob = await resp.blob();

  const video = document.createElement("video");
  video.src = URL.createObjectURL(blob);
  await new Promise<void>((resolve) => { video.onloadedmetadata = () => resolve(); });
  const { videoWidth, videoHeight } = video;

  const startTime = Math.floor(Math.random() * 90 * 60);

  const canvas = document.createElement("canvas");
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  const ctx = canvas.getContext("2d")!;
  const stream = canvas.captureStream(30);
  // Capture audio from the video element
  try {
    const videoStream = (video as unknown as { captureStream(): MediaStream }).captureStream();
    const audioTrack = videoStream.getAudioTracks()[0];
    if (audioTrack) stream.addTrack(audioTrack);
  } catch {}
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);

  const done = new Promise<void>((resolve) => {
    recorder.onstop = () => {
      const out = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      URL.revokeObjectURL(video.src);
      resolve();
    };
  });

  recorder.start();
  video.currentTime = 0;
  await video.play();

  const drawFrame = () => {
    if (video.ended || video.paused) { recorder.stop(); return; }
    ctx.drawImage(video, 0, 0);
    drawWatermarks(ctx, videoWidth, videoHeight, football, flagA, flagB, startTime + Math.floor(video.currentTime));
    requestAnimationFrame(drawFrame);
  };
  drawFrame();

  await done;
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
  const [matchStart] = useState(() => Math.floor(Math.random() * 90 * 60));
  const [elapsed, setElapsed] = useState(0);
  const playingRef = useRef(false);

  useEffect(() => {
    if (!accessToken) return;

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
  const isCompleted = gen?.status === "completed" || (gen?.status === "failed" && !!gen?.outputVideoUrl);
  const isFailed = gen?.status === "failed" && !gen?.outputVideoUrl;

  useEffect(() => {
    if (!isCompleted) return;
    const timer = setInterval(() => {
      if (playingRef.current) setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isCompleted]);

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
                  onPlay={playingRef ? () => { playingRef.current = true; } : undefined}
                  onPause={playingRef ? () => { playingRef.current = false; } : undefined}
                  className="w-full max-h-[60vh] object-contain"
                />

                {/* TV Broadcast Scoreboard Overlay */}
                {(gen.football && (gen.eventCategory === 'football' || gen.eventCategory === 'basketball')) && (() => {
                const fb = JSON.parse(gen.football!);
                return (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    <span className="text-[10px] font-bold text-white truncate max-w-16">{fb.teamA}</span>
                    {fb.codeA && <img src={`https://flagcdn.com/w40/${fb.codeA}.png`} alt="" className="w-3.5 h-2.5 rounded-sm" />}
                    <span className="text-[10px] font-black text-white tabular-nums">{fb.score}</span>
                    {fb.codeB && <img src={`https://flagcdn.com/w40/${fb.codeB}.png`} alt="" className="w-3.5 h-2.5 rounded-sm" />}
                    <span className="text-[10px] font-bold text-white truncate max-w-16">{fb.teamB}</span>
                    <span className="text-[9px] text-white/60 tabular-nums ml-1">{(() => { const t = matchStart + elapsed; const m = Math.floor(t/60); const s = t%60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; })()}</span>
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
                  onPlay={playingRef ? () => { playingRef.current = true; } : undefined}
                  onPause={playingRef ? () => { playingRef.current = false; } : undefined}
                  className="w-full max-h-[60vh] object-contain"
                />
                {(gen.football && (gen.eventCategory === 'football' || gen.eventCategory === 'basketball')) && (() => {
                const fb = JSON.parse(gen.football!);
                return (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    <span className="text-[10px] font-bold text-white truncate max-w-16">{fb.teamA}</span>
                    {fb.codeA && <img src={`https://flagcdn.com/w40/${fb.codeA}.png`} alt="" className="w-3.5 h-2.5 rounded-sm" />}
                    <span className="text-[10px] font-black text-white tabular-nums">{fb.score}</span>
                    {fb.codeB && <img src={`https://flagcdn.com/w40/${fb.codeB}.png`} alt="" className="w-3.5 h-2.5 rounded-sm" />}
                    <span className="text-[10px] font-bold text-white truncate max-w-16">{fb.teamB}</span>
                    <span className="text-[9px] text-white/60 tabular-nums ml-1">{(() => { const t = matchStart + elapsed; const m = Math.floor(t/60); const s = t%60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; })()}</span>
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
            {gen.outputVideoUrl && (
              <button
                onClick={() => {
                  const fb = gen.football ? JSON.parse(gen.football) : null;
                  downloadVideoWithWatermark(gen.outputVideoUrl!, `ifiwasthere-${gen.eventId}`, fb);
                }}
                className="block w-full text-center rounded-xl bg-white/10 border border-white/10 py-3 text-sm font-medium text-gray-900 dark:text-white hover:bg-white/20 transition-colors"
              >
                📥 Download Video
              </button>
            )}
            {gen.outputImageUrl && !gen.outputVideoUrl && (
              <button
                onClick={() => {
                  const fb = gen.football ? JSON.parse(gen.football) : null;
                  downloadImageWithWatermark(gen.outputImageUrl!, `ifiwasthere-${gen.eventId}`, fb);
                }}
                className="block w-full text-center rounded-xl bg-white/10 border border-white/10 py-3 text-sm font-medium text-gray-900 dark:text-white hover:bg-white/20 transition-colors"
              >
                📥 Download Image
              </button>
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
