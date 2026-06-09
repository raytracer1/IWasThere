"use client";

import { useRef, useState, useEffect } from "react";

interface TimeRange {
  start: number; // seconds
  end: number;
}

interface CompositePlayerProps {
  originalUrl: string;
  generatedUrl: string;
  fps: number;
  ranges: TimeRange[];
}

export function CompositePlayer({ originalUrl, generatedUrl, fps, ranges }: CompositePlayerProps) {
  const originalRef = useRef<HTMLVideoElement>(null);
  const generatedRef = useRef<HTMLVideoElement>(null);
  const [activeSource, setActiveSource] = useState<"original" | "generated">("original");
  const [currentTime, setCurrentTime] = useState(0);
  const [rangeIndex, setRangeIndex] = useState(0);
  const rangesRef = useRef(ranges);
  rangesRef.current = ranges;

  useEffect(() => {
    const original = originalRef.current!;
    const generated = generatedRef.current!;

    // Preload generated video
    generated.load();

    let raf: number;
    function tick() {
      const t = original.currentTime;
      setCurrentTime(t);

      const rs = rangesRef.current;
      let active = false;
      for (let i = 0; i < rs.length; i++) {
        const r = rs[i];
        if (t >= r.start && t < r.end) {
          // Inside a range: switch to generated clip
          if (activeSource !== "generated" || rangeIndex !== i) {
            setActiveSource("generated");
            setRangeIndex(i);
            const clipTime = t - r.start;
            if (Math.abs(generated.currentTime - clipTime) > 0.1) {
              generated.currentTime = clipTime;
            }
            original.pause();
            generated.play().catch(() => {});
          }
          active = true;
          break;
        }
      }

      if (!active && activeSource === "generated") {
        // Exited a range: switch back to original
        setActiveSource("original");
        generated.pause();
        original.play().catch(() => {});
      }

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [activeSource, rangeIndex]);

  // Typed as any to avoid TS issues with requestVideoFrameCallback
  const anyOriginal = originalRef as { current: HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number } };

  // Sync generated video timing when active
  useEffect(() => {
    if (activeSource !== "generated") return;
    const original = originalRef.current!;
    const generated = generatedRef.current!;
    const r = ranges[rangeIndex];
    if (!r) return;
    const clipTime = currentTime - r.start;
    if (Math.abs(generated.currentTime - clipTime) > 0.2) {
      generated.currentTime = clipTime;
    }
  }, [currentTime, activeSource, rangeIndex, ranges]);

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg overflow-hidden bg-black" style={{ minHeight: 240 }}>
        <video
          ref={originalRef}
          src={originalUrl}
          controls
          className="w-full"
          style={{ display: activeSource === "original" ? "block" : "none" }}
        />
        <video
          ref={generatedRef}
          src={generatedUrl}
          className="w-full"
          style={{ display: activeSource === "generated" ? "block" : "none" }}
          muted
        />
      </div>
      <p className="text-xs text-gray-400">
        {activeSource === "generated"
          ? `🎬 Playing AI generated (frame range ${ranges[rangeIndex]?.start}-${ranges[rangeIndex]?.end})`
          : "📺 Playing original video"}
      </p>
      <div className="flex gap-1">
        {ranges.map((r, i) => (
          <span key={i} className={`text-xs px-2 py-0.5 rounded ${rangeIndex === i && activeSource === "generated" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-400"}`}>
            {r.start}s-{r.end}s
          </span>
        ))}
      </div>
    </div>
  );
}
