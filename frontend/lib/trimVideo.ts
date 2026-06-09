/**
 * Frame-accurate trimming: MP4Box for metadata + ffmpeg.wasm for encoding.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return ffmpeg;
  ffmpeg = new FFmpeg();
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });
  return ffmpeg;
}

export interface ClipRange {
  startFrame: number;
  endFrame: number;
}

interface VideoMeta {
  fps: number;
  totalFrames: number;
}

export async function getVideoMeta(blob: Blob): Promise<VideoMeta> {
  const MP4Box = await import("mp4box");
  const buffer = await blob.arrayBuffer();

  return new Promise((resolve, reject) => {
    const mp4 = MP4Box.createFile();
    mp4.onError = (e: string) => reject(new Error(e));
    mp4.onReady = (box: { tracks: Array<{ id: number; video?: { width: number; height: number } }>; timescale: number; duration: number }) => {
      const t = box.tracks.find((x) => x.video);
      if (!t) return reject(new Error("No video track"));
      const trak = mp4.getTrackById(t.id) as unknown as { samples?: Array<unknown> } | null;
      const nbSamples = trak?.samples?.length || 0;
      const ts = box.timescale || 1;
      const fps = nbSamples > 0 ? nbSamples / (box.duration / ts) : 24;
      // Wait for samples to populate (async during flush)
      setTimeout(() => {
        const nb = (trak?.samples?.length || 0);
        const ts = box.timescale || 1;
        const fps = nb > 0 ? nb / (box.duration / ts) : 24;
        resolve({ fps: Math.max(fps, 1), totalFrames: nb });
      }, 1000);
    };
    (buffer as unknown as { fileStart: number }).fileStart = 0;
    mp4.appendBuffer(buffer as unknown as import("mp4box").MP4BoxBuffer);
    mp4.flush();
  });
}

export async function trimVideo(
  blob: Blob,
  ranges: ClipRange[],
  onProgress?: (msg: string) => void
): Promise<Blob[]> {
  onProgress?.("Loading ffmpeg...");
  const ff = await getFFmpeg();

  onProgress?.("Reading video metadata...");
  const meta = await getVideoMeta(blob);
  onProgress?.(`${meta.fps.toFixed(1)}fps · ${meta.totalFrames} frames`);

  // Save blob to virtual filesystem
  const inputName = "input.mp4";
  await ff.writeFile(inputName, await fetchFile(blob));

  const clips: Blob[] = [];
  for (let i = 0; i < ranges.length; i++) {
    const { startFrame, endFrame } = ranges[i];
    const outputName = `clip${i}.mp4`;
    onProgress?.(`Clip ${i + 1}: frames ${startFrame}-${endFrame}`);

    // Frame-accurate: select exact frame range, re-encode with consistent PTS
    await ff.exec([
      "-i", inputName,
      "-vf", `select='between(n\\,${startFrame}\\,${endFrame})',setpts=N/FRAME_RATE/TB`,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "18",
      "-an",
      "-movflags", "+faststart",
      outputName,
    ]);

    const data = await ff.readFile(outputName);
    const raw = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
    const bytes = new Uint8Array(raw.byteLength);
    bytes.set(raw);
    clips.push(new Blob([bytes.buffer as ArrayBuffer], { type: "video/mp4" }));
    await ff.deleteFile(outputName);
  }

  await ff.deleteFile(inputName);
  return clips;
}
