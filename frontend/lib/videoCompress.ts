import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const TARGET_HEIGHT = 720;
const TARGET_FPS = 24;

interface CompressionResult {
  blob: Blob;
  originalWidth: number;
  originalHeight: number;
  compressed: boolean;
}

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

export async function compressVideo(file: File, onProgress?: (msg: string) => void): Promise<CompressionResult> {
  const info = await getVideoInfo(file);
  onProgress?.(`Original: ${info.width}x${info.height} @ ${info.fps.toFixed(1)}fps`);

  const needsResize = info.height > TARGET_HEIGHT;
  const needsFpsDrop = info.fps > TARGET_FPS;

  // If no changes needed, return original (already MP4 and suitable)
  if (!needsResize && !needsFpsDrop) {
    return { blob: file, originalWidth: info.width, originalHeight: info.height, compressed: false };
  }

  onProgress?.("Loading ffmpeg...");
  const ff = await getFFmpeg();

  const inputName = "input" + (file.name.includes(".") ? file.name.substring(file.name.lastIndexOf(".")) : ".mp4");
  const outputName = "output.mp4";

  await ff.writeFile(inputName, await fetchFile(file));

  // Build ffmpeg args: scale to 720p if needed, force 24fps, encode as H.264 MP4
  const newWidth = needsResize ? Math.round((TARGET_HEIGHT / info.height) * info.width) : info.width;
  const vfParts: string[] = [];
  if (needsResize) {
    const w = newWidth % 2 === 0 ? newWidth : newWidth + 1;
    vfParts.push(`scale=${w}:${TARGET_HEIGHT}`);
  }
  if (needsFpsDrop) {
    vfParts.push(`fps=${TARGET_FPS}`);
  }
  const vf = vfParts.join(",");

  const args = ["-i", inputName, "-c:v", "libx264", "-preset", "medium", "-crf", "23"];
  if (vf) {
    args.push("-vf", vf);
  }
  args.push("-an", "-movflags", "+faststart", outputName);

  const fromInfo = `${info.width}x${info.height} @ ${info.fps.toFixed(1)}fps`;
  const toParts: string[] = [];
  if (needsResize) toParts.push(`${newWidth}x${TARGET_HEIGHT}`);
  if (needsFpsDrop) toParts.push(`${TARGET_FPS}fps`);
  onProgress?.(`Compressing: ${fromInfo} → ${toParts.join(", ")} (H.264 MP4)...`);
  await ff.exec(args);

  const data = await ff.readFile(outputName);
  const raw = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
  const bytes = new Uint8Array(raw.byteLength);
  bytes.set(raw);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "video/mp4" });

  // Cleanup
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  const parts: string[] = [];
  if (needsResize) parts.push(`${info.width}x${info.height} → ${newWidth}x${TARGET_HEIGHT}`);
  if (needsFpsDrop) parts.push(`${info.fps.toFixed(1)}fps → ${TARGET_FPS}fps`);
  onProgress?.(`Compressed: ${parts.join(", ")} (H.264 MP4)`);

  return { blob, originalWidth: info.width, originalHeight: info.height, compressed: true };
}

async function getVideoInfo(file: File): Promise<{ width: number; height: number; fps: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({ width: video.videoWidth, height: video.videoHeight, fps: detectFpsFromVideo(video) });
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to read video"));
    };
  });
}

function detectFpsFromVideo(video: HTMLVideoElement): number {
  // Try captureStream for accurate FPS
  try {
    const stream = (video as unknown as { captureStream?(): MediaStream }).captureStream?.();
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track) {
        const s = track.getSettings();
        if (s.frameRate && s.frameRate > 0) {
          track.stop();
          return s.frameRate;
        }
        track.stop();
      }
    }
  } catch {}

  // Fallback: assume 30fps (most common for phone videos)
  return 30;
}
