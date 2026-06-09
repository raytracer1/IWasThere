const TARGET_HEIGHT = 720;

interface CompressionResult {
  blob: Blob;
  originalWidth: number;
  originalHeight: number;
  compressed: boolean;
}

export async function compressVideo(file: File, onProgress?: (msg: string) => void): Promise<CompressionResult> {
  const info = await getVideoInfo(file);
  onProgress?.(`Original: ${info.width}x${info.height}`);

  if (info.height <= TARGET_HEIGHT) {
    return { blob: file, originalWidth: info.width, originalHeight: info.height, compressed: false };
  }

  const newWidth = Math.round((TARGET_HEIGHT / info.height) * info.width);
  const newHeight = TARGET_HEIGHT;
  onProgress?.(`Compressing to ${newWidth}x${newHeight}...`);

  const video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  video.muted = true;
  video.playsInline = true;

  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(24);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? "video/webm;codecs=vp8" : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_000_000 });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      URL.revokeObjectURL(video.src);
      resolve({ blob, originalWidth: info.width, originalHeight: info.height, compressed: true });
    };
    recorder.onerror = () => { URL.revokeObjectURL(video.src); reject(new Error("Compression failed")); };

    video.onloadeddata = async () => {
      video.currentTime = 0;
      await video.play();
      recorder.start();
      const draw = () => { if (video.ended) { recorder.stop(); return; } ctx.drawImage(video, 0, 0, newWidth, newHeight); requestAnimationFrame(draw); };
      requestAnimationFrame(draw);
      setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 120_000);
    };
    video.onerror = () => { URL.revokeObjectURL(video.src); reject(new Error("Failed to load video")); };
    video.load();
  });
}

async function getVideoInfo(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve({ width: video.videoWidth, height: video.videoHeight }); };
    video.onerror = () => { URL.revokeObjectURL(video.src); reject(new Error("Failed to read video")); };
  });
}
