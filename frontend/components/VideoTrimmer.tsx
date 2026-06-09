"use client";

import { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";

export interface ClipRange {
  startFrame: number;
  endFrame: number;
}

export interface VideoTrimmerHandle {
  getRanges: () => ClipRange[];
  trimAll: () => Promise<Blob[]>;
  captureFrame: () => Promise<Blob | null>;
}

interface VideoTrimmerProps {
  blob: Blob;
  type: string;
  initialRanges?: ClipRange[];
  onRangesChange?: (ranges: ClipRange[]) => void;
  onThumbnailCapture?: (blob: Blob) => void;
}

const VideoTrimmer = forwardRef<VideoTrimmerHandle, VideoTrimmerProps>(function VideoTrimmer({ blob, type, initialRanges, onRangesChange, onThumbnailCapture }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [duration, setDuration] = useState(0);
  const [nativeFps, setNativeFps] = useState(24);
  const [currentFrame, setCurrentFrame] = useState(0);
  const currentFrameRef = useRef(0);
  const [pendingStart, setPendingStart] = useState<number | null>(null);
  const [pendingEnd, setPendingEnd] = useState<number | null>(null);
  const [ranges, setRanges] = useState<ClipRange[]>([]);
  const rangesRef = useRef<ClipRange[]>([]);
  const [ready, setReady] = useState(false);

  const videoUrl = useMemo(() => URL.createObjectURL(blob), [blob]);
  const totalFrames = Math.round(duration * nativeFps);

  useEffect(() => { rangesRef.current = ranges; onRangesChange?.(ranges); }, [ranges]);

  // Restore initial ranges (edit mode) — only once
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!restoredRef.current && initialRanges && initialRanges.length > 0) {
      setRanges(initialRanges);
      restoredRef.current = true;
    }
  }, [initialRanges]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.src = videoUrl;
    video.load();
  }, [videoUrl]);

  function onLoaded() {
    const video = videoRef.current!;
    setDuration(video.duration);
    let fps = 24;
    try {
      const stream = (video as unknown as { captureStream?(): MediaStream }).captureStream?.();
      if (stream) {
        const track = stream.getVideoTracks()[0];
        if (track) { const s = track.getSettings(); if (s.frameRate && s.frameRate > 0) fps = s.frameRate; }
        track?.stop();
      }
    } catch {}
    setNativeFps(fps);
    setReady(true);
  }

  useEffect(() => {
    if (!ready) return;
    const video = videoRef.current!;
    const interval = setInterval(() => {
      const frame = Math.round(video.currentTime * nativeFps);
      if (frame !== currentFrameRef.current) { currentFrameRef.current = frame; setCurrentFrame(frame); }
    }, 200);
    return () => clearInterval(interval);
  }, [ready, nativeFps]);

  function seekToFrame(frame: number) {
    const video = videoRef.current!;
    frame = Math.max(0, Math.min(frame, totalFrames));
    video.currentTime = frame / nativeFps;
  }
  function stepFrame(delta: number) { videoRef.current!.pause(); seekToFrame(currentFrameRef.current + delta); }
  function markStart() { setPendingStart(currentFrame); setPendingEnd(null); }
  function markEnd() { if (pendingStart !== null && currentFrame > pendingStart) setPendingEnd(currentFrame); }
  function addRange() {
    if (pendingStart !== null && pendingEnd !== null) {
      const newRange = { startFrame: pendingStart, endFrame: pendingEnd };
      setRanges((r) => [...r, newRange].sort((a, b) => a.startFrame - b.startFrame));
      setPendingStart(null); setPendingEnd(null);
    }
  }
  function removeRange(idx: number) { setRanges((r) => r.filter((_, i) => i !== idx)); }

  // Exposed methods
  useImperativeHandle(ref, () => ({
    getRanges: () => rangesRef.current,
    captureFrame: async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return null;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9));
    },
    trimAll: async () => {
      const rs = rangesRef.current;
      if (rs.length === 0) return [];

      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? "video/webm;codecs=vp8" : "video/webm";
      const clips: Blob[] = [];

      for (const { startFrame, endFrame } of rs) {
        const stream = canvas.captureStream(nativeFps);
        const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);

        await new Promise<void>((resolve) => {
          recorder.onstop = () => { clips.push(new Blob(chunks, { type: mime })); resolve(); };
          recorder.onerror = () => resolve();
          video.currentTime = startFrame / nativeFps;
          video.play().then(() => {
            recorder.start();
            const draw = () => {
              if (video.currentTime >= endFrame / nativeFps || video.ended) { recorder.stop(); video.pause(); return; }
              ctx.drawImage(video, 0, 0);
              requestAnimationFrame(draw);
            };
            requestAnimationFrame(draw);
            setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 120_000);
          });
        });
      }
      return clips;
    },
  }), [nativeFps]);

  const hasPending = pendingStart !== null;
  const pendingReady = hasPending && pendingEnd !== null;
  const totalSelected = ranges.reduce((s, r) => s + r.endFrame - r.startFrame, 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        {(blob.size / 1024 / 1024).toFixed(1)}MB · {ready ? `${nativeFps}fps · ${duration.toFixed(1)}s · ${totalFrames} frames` : ""}
      </p>

      <video ref={videoRef} controls preload="metadata" playsInline
        className="w-full rounded-lg bg-black" onLoadedMetadata={onLoaded} style={{ maxHeight: 360 }}>
        <source src={videoUrl} type={type} />
      </video>

      {ready && (
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => stepFrame(-1)} className="rounded bg-gray-700 px-2 py-1 text-xs text-white">◀◀</button>
          <button type="button" onClick={() => stepFrame(-10)} className="rounded bg-gray-700 px-2 py-1 text-xs text-white">-10</button>
          <span className="text-sm font-mono text-white bg-gray-800 rounded px-3 py-1">Frame: {currentFrame} / {totalFrames}</span>
          <button type="button" onClick={() => stepFrame(10)} className="rounded bg-gray-700 px-2 py-1 text-xs text-white">+10</button>
          <button type="button" onClick={() => stepFrame(1)} className="rounded bg-gray-700 px-2 py-1 text-xs text-white">▶▶</button>
        </div>
      )}

      {ready && (
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={markStart} className="rounded bg-green-600 px-3 py-1 text-sm text-white">
            🟢 In: {pendingStart !== null ? `#${pendingStart}` : "--"}
          </button>
          <button type="button" onClick={markEnd} disabled={!hasPending}
            className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50">
            🔴 Out: {pendingEnd !== null ? `#${pendingEnd}` : "--"}
          </button>
          <button type="button" onClick={addRange} disabled={!pendingReady}
            className="rounded bg-purple-600 px-3 py-1 text-sm text-white disabled:opacity-50">
            + Add
          </button>
          {pendingReady && <span className="text-sm text-purple-400">{pendingEnd! - pendingStart!} frames</span>}
          <div className="flex-1" />
          {onThumbnailCapture && (
            <button type="button" onClick={async () => {
              const video = videoRef.current;
              if (!video || video.readyState < 2) return;
              const canvas = document.createElement("canvas");
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              canvas.getContext("2d")!.drawImage(video, 0, 0);
              canvas.toBlob((blob) => {
                if (blob) {
                  onThumbnailCapture(blob);
                }
              }, "image/jpeg", 0.9);
            }} className="rounded bg-yellow-600 px-3 py-1 text-sm text-white hover:bg-yellow-500">
              📸 Set Thumbnail
            </button>
          )}
        </div>

      )}

      {ranges.length > 0 && (
        <div className="space-y-1 rounded-lg bg-gray-800 p-3">
          <p className="text-xs text-gray-400 mb-2">📋 {ranges.length} range(s) · {totalSelected} frames total</p>
          {ranges.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-green-400">#{r.startFrame}</span> → <span className="text-red-400">#{r.endFrame}</span>
              <span className="text-gray-500">({r.endFrame - r.startFrame}f)</span>
              <button type="button" onClick={() => removeRange(i)} className="ml-2 text-xs text-red-400 hover:text-red-300">✕</button>
            </div>
          ))}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
});

export default VideoTrimmer;
