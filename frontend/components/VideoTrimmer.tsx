"use client";

import { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { trimVideo, type ClipRange, getVideoMeta } from "@/lib/trimVideo";

export type { ClipRange };

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

const VideoTrimmer = forwardRef<VideoTrimmerHandle, VideoTrimmerProps>(function VideoTrimmer(
  { blob, type, initialRanges, onRangesChange, onThumbnailCapture }, ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [duration, setDuration] = useState(0);
  const [nativeFps, setNativeFps] = useState(24);
  const [currentFrame, setCurrentFrame] = useState(0);
  const currentFrameRef = useRef(0);
  const [pendingStart, setPendingStart] = useState<number | null>(null);
  const [pendingEnd, setPendingEnd] = useState<number | null>(null);
  const [range, setRange] = useState<ClipRange | null>(null);
  const rangeRef = useRef<ClipRange | null>(null);
  const [ready, setReady] = useState(false);

  const videoUrl = useMemo(() => URL.createObjectURL(blob), [blob]);
  const totalFrames = nativeFps > 0 && duration > 0 ? Math.round(duration * nativeFps) : 0;

  useEffect(() => {
    rangeRef.current = range;
    onRangesChange?.(range ? [range] : []);
  }, [range, onRangesChange]);

  const restoredRef = useRef(false);
  useEffect(() => {
    if (!restoredRef.current && initialRanges && initialRanges.length > 0) {
      setRange(initialRanges[0]);
      restoredRef.current = true;
    }
  }, [initialRanges]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.src = videoUrl;
    video.load();
  }, [videoUrl]);

  async function onLoaded() {
    const video = videoRef.current!;
    const dur = isFinite(video.duration) ? video.duration : 0;
    setDuration(dur);
    getVideoMeta(blob).then((meta) => {
      if (meta.fps > 0) setNativeFps(meta.fps);
      else fallback();
    }).catch(() => fallback()).finally(() => setReady(true));

    function fallback() {
      if (nativeFps > 0) return;
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
    }
  }

  // Track actual presented frame via requestVideoFrameCallback (Chrome/Edge)
  // Falls back to time-based calculation
  useEffect(() => {
    if (!ready) return;
    const video = videoRef.current!;
    let startFrameNum = 0;
    let startPresented = 0;

    function getFrameNumber(now: number, metadata: { presentedFrames: number }) {
      if (startPresented === 0) {
        startPresented = metadata.presentedFrames;
        startFrameNum = Math.round(video.currentTime * nativeFps);
      }
      const delta = metadata.presentedFrames - startPresented;
      return startFrameNum + delta;
    }

    let rafId: number;
    function loop(now: number, metadata: { presentedFrames: number }) {
      const frame = getFrameNumber(now, metadata);
      if (frame !== currentFrameRef.current) {
        currentFrameRef.current = frame;
        setCurrentFrame(frame);
      }
      rafId = (video as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: (now: number, meta: { presentedFrames: number }) => void) => number;
      }).requestVideoFrameCallback?.(loop) ?? 0;
    }

    const onSeeked = () => {
      startPresented = 0;
      startFrameNum = Math.round(video.currentTime * nativeFps);
    };
    video.addEventListener('seeked', onSeeked);

    try {
      rafId = (video as { requestVideoFrameCallback?: (cb: typeof loop) => number })
        .requestVideoFrameCallback?.(loop) ?? 0;
    } catch {
      const interval = setInterval(() => {
        const frame = Math.floor(video.currentTime * nativeFps + 0.0001);
        if (frame !== currentFrameRef.current) { currentFrameRef.current = frame; setCurrentFrame(frame); }
      }, 200);
      return () => { clearInterval(interval); video.removeEventListener('seeked', onSeeked); };
    }

    return () => {
      if (rafId) {
        (video as { cancelVideoFrameCallback?: (id: number) => void }).cancelVideoFrameCallback?.(rafId);
      }
      video.removeEventListener('seeked', onSeeked);
    };
  }, [ready, nativeFps]);

  function seekToFrame(target: number) {
    target = Math.max(0, Math.min(target, totalFrames));
    const video = videoRef.current!;
    video.pause();
    const targetTime = target / nativeFps;
    video.currentTime = targetTime;
    const check = () => {
      const actual = Math.floor(video.currentTime * nativeFps + 0.0001);
      if (actual === target) return;
      video.currentTime = targetTime;
      (video as { requestVideoFrameCallback?: (cb: () => void) => void }).requestVideoFrameCallback?.(check);
    };
    try {
      (video as { requestVideoFrameCallback?: (cb: () => void) => void }).requestVideoFrameCallback?.(check);
    } catch {}
  }
  function stepFrame(delta: number) { seekToFrame(currentFrameRef.current + delta); }
  function markStart() { setPendingStart(currentFrame); setPendingEnd(null); }
  function markEnd() { if (pendingStart !== null && currentFrame > pendingStart) setPendingEnd(currentFrame); }
  function setCurrentRange() {
    if (pendingStart !== null && pendingEnd !== null) {
      setRange({ startFrame: pendingStart, endFrame: pendingEnd });
      setPendingStart(null); setPendingEnd(null);
    }
  }
  function clearRange() { setRange(null); }

  useImperativeHandle(ref, () => ({
    getRanges: () => rangeRef.current ? [rangeRef.current] : [],
    captureFrame: async () => {
      const v = videoRef.current;
      if (!v || v.readyState < 2) return null;
      const c = document.createElement("canvas");
      c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext("2d")!.drawImage(v, 0, 0);
      return new Promise((r) => c.toBlob((b) => r(b), "image/jpeg", 0.9));
    },
    trimAll: async () => {
      if (!rangeRef.current) return [];
      return trimVideo(blob, [rangeRef.current]);
    },
  }), [blob]);

  const hasPending = pendingStart !== null;
  const pendingReady = hasPending && pendingEnd !== null;
  const totalSelected = range ? range.endFrame - range.startFrame + 1 : 0;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        {(blob.size / 1024 / 1024).toFixed(1)}MB · {ready ? `${nativeFps.toFixed(3)}fps · ${duration.toFixed(1)}s · ${totalFrames} frames` : ""}
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
          <button type="button" onClick={markStart} disabled={!!range}
            className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50">
            🟢 In: {pendingStart !== null ? `#${pendingStart}` : range ? `#${range.startFrame}` : "--"}</button>
          <button type="button" onClick={markEnd} disabled={!hasPending}
            className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50">
            🔴 Out: {pendingEnd !== null ? `#${pendingEnd}` : range ? `#${range.endFrame}` : "--"}</button>
          {!range ? (
            <button type="button" onClick={setCurrentRange} disabled={!pendingReady}
              className="rounded bg-purple-600 px-3 py-1 text-sm text-white disabled:opacity-50">
              ✓ Set</button>
          ) : (
            <button type="button" onClick={clearRange}
              className="rounded bg-gray-600 px-3 py-1 text-sm text-white hover:bg-gray-500">
              ✕ Clear</button>
          )}
          {pendingReady && <span className="text-sm text-purple-400">{pendingEnd! - pendingStart! + 1} frames</span>}
          <div className="flex-1" />
          {onThumbnailCapture && (
            <button type="button" onClick={async () => {
              const v = videoRef.current;
              if (!v || v.readyState < 2) return;
              const c = document.createElement("canvas");
              c.width = v.videoWidth; c.height = v.videoHeight;
              c.getContext("2d")!.drawImage(v, 0, 0);
              c.toBlob((b) => { if (b) onThumbnailCapture(b); }, "image/jpeg", 0.9);
            }} className="rounded bg-yellow-600 px-3 py-1 text-sm text-white hover:bg-yellow-500">
              📸 Set Thumbnail</button>
          )}
        </div>
      )}
      {range && (
        <div className="rounded-lg bg-gray-800 p-3">
          <p className="text-xs text-gray-400 mb-1">📋 Range · {totalSelected} frames</p>
          <p className="text-sm">
            <span className="text-green-400">#{range.startFrame}</span>
            {" → "}
            <span className="text-red-400">#{range.endFrame}</span>
            <span className="text-gray-500 ml-2">({range.endFrame - range.startFrame + 1}f)</span>
          </p>
        </div>
      )}
    </div>
  );
});

export default VideoTrimmer;
