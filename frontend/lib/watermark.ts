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

export async function downloadWithWatermark(
  videoUrl: string,
  onProgress?: (msg: string) => void
): Promise<void> {
  onProgress?.("Loading ffmpeg...");
  const ff = await getFFmpeg();

  onProgress?.("Downloading video...");
  const inputName = "input.mp4";
  await ff.writeFile(inputName, await fetchFile(videoUrl));

  // Probe video dimensions
  onProgress?.("Probing video...");
  const wmName = "watermark.png";
  const wmBlob = await createWatermarkPng();
  const wmBuf = await wmBlob.arrayBuffer();
  await ff.writeFile(wmName, new Uint8Array(wmBuf));

  onProgress?.("Adding watermark...");
  // overlay=W-w-20:H-h-20 places watermark in bottom-right with 20px margin
  await ff.exec([
    "-i", inputName,
    "-i", wmName,
    "-filter_complex", "overlay=W-w-20:H-h-20",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "23",
    "-c:a", "copy",
    "-movflags", "+faststart",
    "output.mp4",
  ]);

  onProgress?.("Preparing download...");
  const data = await ff.readFile("output.mp4");
  const raw = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
  const blob = new Blob([raw.buffer as ArrayBuffer], { type: "video/mp4" });

  await ff.deleteFile(inputName);
  await ff.deleteFile(wmName);
  await ff.deleteFile("output.mp4");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "i-was-there-video.mp4";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  onProgress?.("Done!");
}

/** Generate a small transparent PNG with "IWasThere.Ai" text */
function createWatermarkPng(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const fontSize = 24;
  ctx.font = `bold ${fontSize}px sans-serif`;
  const text = "IWasThere.Ai";
  const m = ctx.measureText(text);
  const pad = 8;
  canvas.width = Math.ceil(m.width + pad * 2);
  canvas.height = Math.ceil(fontSize * 1.5 + pad * 2);

  // Transparent background with white text + shadow
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillText(text, canvas.width - pad + 2, canvas.height - pad + 2);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(text, canvas.width - pad, canvas.height - pad);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}
