"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { fetchGeneration } from "@/lib/api";
import type { Generation } from "@/lib/types";
import { CaptionPicker } from "@/components/CaptionPicker";
import { POLL_INTERVAL_MS } from "@/lib/types";

const WATERMARK = "IfIWasThere.AI";

// Module-level dedup sets for polling-detected events (survive component remounts)
const trackedCompletedIds = new Set<string>();
const trackedFailedIds = new Set<string>();

const flagCache = new Map<string, HTMLImageElement>();

async function loadFlag(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  if (flagCache.has(url)) return flagCache.get(url)!;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    // Proxy through Next.js to bypass CORS
    img.src = `/api/proxy?url=${encodeURIComponent(url)}`;
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(); });
    flagCache.set(url, img);
    return img;
  } catch { return null; }
}

function drawWatermarks(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  game: { teamA: string; teamB: string; score: string; flagA?: string; flagB?: string; codeA?: string; codeB?: string; sport?: string } | null,
  flagA?: HTMLImageElement | null,
  flagB?: HTMLImageElement | null,
  matchSeconds = 0
) {
  const fontSize = Math.max(10, width / 60);

  // Top‑left: channel logo
  ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
  ctx.lineWidth = 1;
  ctx.strokeText(WATERMARK, 8, fontSize + 6);
  ctx.fillText(WATERMARK, 8, fontSize + 6);



  // Scoreboard
  if (game) {
    const isBasket = (game as Record<string,unknown>).sport === 'basketball';

    if (isBasket) {
      const teamA = (game.codeA || '').toUpperCase().slice(0, 2);
      const teamB = (game.codeB || '').toUpperCase().slice(0, 2);
      const scores = [game.score.split(':')[0] || '0', game.score.split(':')[1] || '0'];
      const f = Math.max(12, Math.round(width / 36));
      const padX = Math.round(f * 0.2);
      const padY = Math.round(f * 0.1);
      const fTeam = Math.round(f * 0.7);

      ctx.textBaseline = "middle";
      ctx.font = `bold ${fTeam}px Arial, Helvetica, sans-serif`;
      const taW = ctx.measureText(teamA).width;
      const tbW = ctx.measureText(teamB).width;
      ctx.font = `bold ${f}px Arial, Helvetica, sans-serif`;
      const scA_W = ctx.measureText(scores[0]).width;
      const scB_W = ctx.measureText(scores[1]).width;
      const teamGap = Math.round(f * 0.7);
      const itemGap = Math.round(f * 0.25);
      const blockA_W = taW + teamGap + scA_W + padX * 2;
      const blockB_W = tbW + teamGap + scB_W + padX * 2;

      const maxSec = 12 * 60; const t = matchSeconds % maxSec;
      const remaining = maxSec - t;
      const mins = Math.floor(remaining / 60); const secs = remaining % 60;
      const period = Math.floor(matchSeconds / maxSec) + 1;
      const clock = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
      const periodText = period <= 4 ? ["1st","2nd","3rd","4th"][period-1] : "OT";
      const shotRemaining = 24 - (t % 24);
      const shotClock = String(shotRemaining).padStart(2,'0');

      const f2 = Math.round(f * 0.75); const fClock = Math.round(f * 0.85);
      ctx.font = `bold ${f2}px Arial, Helvetica, sans-serif`;
      const perW = ctx.measureText(periodText).width;
      const shotW = ctx.measureText(shotClock).width;
      ctx.font = `bold ${fClock}px Arial, Helvetica, sans-serif`;
      const clkW = ctx.measureText(clock).width;

      const ckPadX2 = Math.round(fClock * 0.25) * 2;
      const perGap = Math.round(f * 0.15);
      const totalW = blockA_W + blockB_W + perGap + perW + itemGap + (clkW + ckPadX2) + itemGap + shotW + padX * 2;

      const barH = f + padY * 2 + 1;
      const barW = totalW;
      const barX = (width - barW) / 2;
      const barY = height - 36 - barH / 2 + 1;
      const midY = barY + barH / 2;

      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(barX, barY, barW, barH);

      let sx = barX + padX;

      // Team A — blue bg, team small + score normal
      ctx.fillStyle = "#006BB6";
      ctx.fillRect(sx - padX, barY, blockA_W, barH);
      ctx.font = `bold ${fTeam}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = "white";
      ctx.fillText(teamA, sx, midY);
      ctx.font = `bold ${f}px Arial, Helvetica, sans-serif`;
      ctx.fillText(scores[0], sx + taW + teamGap, midY);
      sx += blockA_W;

      // Team B — white bg, team small + score normal
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(sx - padX, barY, blockB_W, barH);
      ctx.font = `bold ${fTeam}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = "#000000";
      ctx.fillText(teamB, sx, midY);
      ctx.font = `bold ${f}px Arial, Helvetica, sans-serif`;
      ctx.fillText(scores[1], sx + tbW + teamGap, midY);
      sx += blockB_W + Math.round(f * 0.15);

      // Period
      ctx.font = `bold ${f2}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(periodText, sx, midY);
      sx += perW + itemGap;

      // Game clock — amber rounded border, text centered
      const ckPadX = Math.round(fClock * 0.25);
      const ckPadY = Math.round(fClock * 0.05);
      const ckW = clkW + ckPadX * 2;
      const ckH = fClock + ckPadY * 2;
      const ckX = sx;
      ctx.strokeStyle = "#FFCC00"; ctx.lineWidth = 1.5;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.roundRect(ckX, midY - ckH/2, ckW, ckH, ckH/2);
      ctx.fill(); ctx.stroke();
      ctx.font = `bold ${fClock}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = "#FFCC00";
      ctx.textAlign = 'center';
      ctx.fillText(clock, ckX + ckW/2, midY);
      ctx.textAlign = 'left';
      sx = ckX + ckW + itemGap;

      // Shot clock — white
      ctx.font = `bold ${f2}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = "white";
      ctx.fillText(shotClock, sx, midY);

      ctx.textBaseline = "alphabetic";
    } else {
      const teamADisplay = game.teamA;
      const teamBDisplay = game.teamB;

      const scoreFontSize = Math.max(11, Math.round(width / 55));
      const teamFontSize = Math.max(9, Math.round(scoreFontSize * 0.85));
      const flgH = Math.round(scoreFontSize * 0.8);
      const flgW = Math.round(flgH * 1.6);
      const gap = Math.round(scoreFontSize * 0.3);
      const midY = 6 + scoreFontSize / 2;

      ctx.textBaseline = "middle";

      ctx.font = `bold ${teamFontSize}px Arial, Helvetica, sans-serif`;
      const taW = ctx.measureText(teamADisplay).width;
      ctx.font = `bold ${scoreFontSize}px Arial, Helvetica, sans-serif`;
      const scoreSpacing = Math.round(scoreFontSize * 0.35);
      let scW = 0;
      for (const ch of game.score) { scW += ctx.measureText(ch).width + scoreSpacing; }
      scW -= scoreSpacing;
      ctx.font = `bold ${teamFontSize}px Arial, Helvetica, sans-serif`;
      const tbW = ctx.measureText(teamBDisplay).width;

      const clockFontSize = Math.max(9, Math.round(scoreFontSize * 0.85));
      ctx.font = `bold ${clockFontSize}px Arial, Helvetica, sans-serif`;
      const maxSec = 90 * 60;
      const t = matchSeconds % maxSec;
      const mins = Math.floor(t / 60);
      const secs = t % 60;
      const clock = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
      const clkW = ctx.measureText(clock).width;

      const flagAW = flagA ? flgW + gap : 0;
      const flagBW = flagB ? flgW + gap : 0;
      const totalW = taW + gap + flagAW + scW + gap + flagBW + tbW + gap * 2 + clkW;
      let sx = width - totalW - 8;

      const drawText = (text: string, fontSize: number, x: number) => {
        ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
        ctx.fillStyle = "white";
        ctx.strokeStyle = "rgba(0,0,0,0.7)";
        ctx.lineWidth = 1;
        ctx.strokeText(text, x, midY);
        ctx.fillText(text, x, midY);
      };

      drawText(teamADisplay, teamFontSize, sx);
      sx += taW + gap;
      if (flagA) { ctx.drawImage(flagA, sx, midY - flgH/2, flgW, flgH); sx += flgW + gap; }

      ctx.font = `bold ${scoreFontSize}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 1;
      for (const ch of game.score) {
        ctx.strokeText(ch, sx, midY);
        ctx.fillText(ch, sx, midY);
        sx += ctx.measureText(ch).width + scoreSpacing;
      }
      sx -= scoreSpacing;
      sx += gap;

      if (flagB) { ctx.drawImage(flagB, sx, midY - flgH/2, flgW, flgH); sx += flgW + gap; }
      drawText(teamBDisplay, teamFontSize, sx);
      sx += tbW + gap * 2;

      ctx.font = `bold ${clockFontSize}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 1;
      ctx.strokeText(clock, sx, midY);
      ctx.fillText(clock, sx, midY);

      ctx.textBaseline = "alphabetic";
    }
  }
}

async function downloadImageWithWatermark(
  imageUrl: string, filename: string,
  game: { teamA: string; teamB: string; score: string; flagA?: string; flagB?: string; codeA?: string; codeB?: string;  } | null
) {
  const [img, flagA, flagB] = await Promise.all([
    new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image(); i.crossOrigin = "anonymous"; i.src = imageUrl;
      i.onload = () => resolve(i); i.onerror = () => reject(new Error("load failed"));
    }),
    loadFlag(game?.flagA || ''),
    loadFlag(game?.flagB || ''),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const matchTime = Math.floor(Math.random() * 90 * 60);
  drawWatermarks(ctx, canvas.width, canvas.height, game, flagA, flagB, matchTime);

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
  game: { teamA: string; teamB: string; score: string; flagA?: string; flagB?: string; codeA?: string; codeB?: string;  } | null
) {
  const [flagA, flagB] = await Promise.all([
    loadFlag(game?.flagA || ''),
    loadFlag(game?.flagB || ''),
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
    drawWatermarks(ctx, videoWidth, videoHeight, game, flagA, flagB, startTime + Math.floor(video.currentTime));
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
          if (res.data.status === "completed" && !trackedCompletedIds.has(generationId)) {
            trackedCompletedIds.add(generationId);
            if (typeof pendo !== 'undefined') {
              pendo.track("generation_completed", {
                generationId,
                eventId: res.data.eventId,
                eventCategory: res.data.eventCategory || '',
                eventTitle: (res.data.eventTitle || '').substring(0, 100),
                hasOutputVideo: !!res.data.outputVideoUrl,
                hasOutputImage: !!res.data.outputImageUrl,
                hasCaptions: !!(res.data.captions?.length),
                captionCount: res.data.captions?.length || 0,
              });
            }
          }
          if (res.data.status === "failed" && !res.data.outputVideoUrl && !trackedFailedIds.has(generationId)) {
            trackedFailedIds.add(generationId);
            if (typeof pendo !== 'undefined') {
              pendo.track("generation_failed", {
                generationId,
                eventId: res.data.eventId,
                eventCategory: res.data.eventCategory || '',
                errorMessage: (res.data.errorMessage || '').substring(0, 200),
              });
            }
          }
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
                {((gen.football || gen.basketball) && (gen.eventCategory === 'football' || gen.eventCategory === 'basketball')) && (() => {
                const gameJson = gen.basketball || gen.football;
                if (!gameJson) return null;
                const fb = JSON.parse(gameJson);
                const isBasket = !!gen.basketball;
                const aName = isBasket ? (fb.codeA || '').toUpperCase().slice(0,2) : fb.teamA;
                const bName = isBasket ? (fb.codeB || '').toUpperCase().slice(0,2) : fb.teamB;
                const maxSec = isBasket ? 12 * 60 : 90 * 60;
                const remaining = maxSec - ((matchStart + elapsed) % maxSec);
                const cm = Math.floor(remaining / 60);
                const cs = remaining % 60;
                const clock = `${String(cm).padStart(2, '0')}:${String(cs).padStart(2, '0')}`;
                const shotRemaining = 24 - ((matchStart + elapsed) % 24);
                const shotClock = String(shotRemaining).padStart(2, '0');
                const period = Math.floor((matchStart + elapsed) / maxSec) + 1;
                const periodText = period <= 4 ? ["1st","2nd","3rd","4th"][period-1] : "OT";
                const scores = fb.score.split(':');
                if (isBasket) {
                  return (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center bg-[#1a1a1a] text-[11px] leading-tight">
                      <span className="bg-[#006BB6] text-white font-bold px-1.5 py-0.5 py-1">{aName} &nbsp;&nbsp; {scores[0]}</span>
                      <span className="bg-white text-black font-bold px-1.5 py-1">{bName} &nbsp;&nbsp; {scores[1]}</span>
                      <span className="text-white/50 text-[10px] px-1">{periodText}</span>
                      <span className="text-amber-400 text-[12px] font-bold border border-amber-400 rounded-full px-1.5">{clock}</span>
                      <span className="text-white font-mono text-[10px] px-1">{shotClock}</span>
                    </div>
                  );
                }
                return (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    <span className="text-[10px] font-bold text-white truncate max-w-12">{aName}</span>
                    {fb.flagA && <img src={fb.flagA} alt="" className="w-3.5 h-2.5 rounded-sm" />}
                    <span className="text-[10px] font-black text-white tabular-nums tracking-[0.15em]">{fb.score}</span>
                    {fb.flagB && <img src={fb.flagB} alt="" className="w-3.5 h-2.5 rounded-sm" />}
                    <span className="text-[10px] font-bold text-white truncate max-w-12">{bName}</span>
                    <span className="text-[9px] text-white/60 tabular-nums font-sans ml-1">{clock}</span>
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
                {((gen.football || gen.basketball) && (gen.eventCategory === 'football' || gen.eventCategory === 'basketball')) && (() => {
                const gameJson = gen.basketball || gen.football;
                if (!gameJson) return null;
                const fb = JSON.parse(gameJson);
                const isBasket = !!gen.basketball;
                const aName = isBasket ? (fb.codeA || '').toUpperCase().slice(0,2) : fb.teamA;
                const bName = isBasket ? (fb.codeB || '').toUpperCase().slice(0,2) : fb.teamB;
                const maxSec = isBasket ? 12 * 60 : 90 * 60;
                const remaining = maxSec - ((matchStart + elapsed) % maxSec);
                const cm = Math.floor(remaining / 60);
                const cs = remaining % 60;
                const clock = `${String(cm).padStart(2, '0')}:${String(cs).padStart(2, '0')}`;
                const shotRemaining = 24 - ((matchStart + elapsed) % 24);
                const shotClock = String(shotRemaining).padStart(2, '0');
                const period = Math.floor((matchStart + elapsed) / maxSec) + 1;
                const periodText = period <= 4 ? ["1st","2nd","3rd","4th"][period-1] : "OT";
                const scores = fb.score.split(':');
                if (isBasket) {
                  return (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center bg-[#1a1a1a] text-[11px] leading-tight">
                      <span className="bg-[#006BB6] text-white font-bold px-1.5 py-0.5 py-1">{aName} &nbsp;&nbsp; {scores[0]}</span>
                      <span className="bg-white text-black font-bold px-1.5 py-1">{bName} &nbsp;&nbsp; {scores[1]}</span>
                      <span className="text-white/50 text-[10px] px-1">{periodText}</span>
                      <span className="text-amber-400 text-[12px] font-bold border border-amber-400 rounded-full px-1.5">{clock}</span>
                      <span className="text-white font-mono text-[10px] px-1">{shotClock}</span>
                    </div>
                  );
                }
                return (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    <span className="text-[10px] font-bold text-white truncate max-w-12">{aName}</span>
                    {fb.flagA && <img src={fb.flagA} alt="" className="w-3.5 h-2.5 rounded-sm" />}
                    <span className="text-[10px] font-black text-white tabular-nums tracking-[0.15em]">{fb.score}</span>
                    {fb.flagB && <img src={fb.flagB} alt="" className="w-3.5 h-2.5 rounded-sm" />}
                    <span className="text-[10px] font-bold text-white truncate max-w-12">{bName}</span>
                    <span className="text-[9px] text-white/60 tabular-nums font-sans ml-1">{clock}</span>
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
              onSelect={(caption) => {
                setSelectedCaption(caption);
                if (typeof pendo !== 'undefined') {
                  pendo.track("caption_selected", {
                    generationId,
                    eventId: gen.eventId,
                    captionIndex: gen.captions!.indexOf(caption),
                    captionLength: caption.length,
                  });
                }
              }}
              selected={selectedCaption}
            />
          )}

          {/* Share / Download */}
          <div className="space-y-3">
            {gen.outputVideoUrl && (
              <button
                onClick={() => {
                  const fb = (gen.basketball || (gen.football || gen.basketball)) ? JSON.parse((gen.basketball || (gen.football || gen.basketball))!) : null;
                  downloadVideoWithWatermark(gen.outputVideoUrl!, `ifiwasthere-${gen.eventId}`, fb);
                  if (typeof pendo !== 'undefined') {
                    pendo.track("video_downloaded", {
                      generationId,
                      eventId: gen.eventId,
                      eventCategory: gen.eventCategory || '',
                      hasScoreboard: !!fb,
                      outputFormat: 'video',
                    });
                  }
                }}
                className="block w-full text-center rounded-xl bg-white/10 border border-white/10 py-3 text-sm font-medium text-gray-900 dark:text-white hover:bg-white/20 transition-colors"
              >
                📥 Download Video
              </button>
            )}
            {gen.outputImageUrl && !gen.outputVideoUrl && (
              <button
                onClick={() => {
                  const fb = (gen.basketball || (gen.football || gen.basketball)) ? JSON.parse((gen.basketball || (gen.football || gen.basketball))!) : null;
                  downloadImageWithWatermark(gen.outputImageUrl!, `ifiwasthere-${gen.eventId}`, fb);
                  if (typeof pendo !== 'undefined') {
                    pendo.track("image_downloaded", {
                      generationId,
                      eventId: gen.eventId,
                      eventCategory: gen.eventCategory || '',
                      hasScoreboard: !!fb,
                    });
                  }
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
                  if (typeof pendo !== 'undefined') {
                    pendo.track("shared_on_x", {
                      generationId,
                      eventId: gen.eventId,
                      eventCategory: gen.eventCategory || '',
                      captionLength: selectedCaption.length,
                    });
                  }
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
