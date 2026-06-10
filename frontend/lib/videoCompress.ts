const TARGET_HEIGHT = 720;
const TARGET_FPS = 24;

interface CompressionResult {
  blob: Blob;
  originalWidth: number;
  originalHeight: number;
  compressed: boolean;
}

export async function compressVideo(file: File, onProgress?: (msg: string) => void): Promise<CompressionResult> {
  const info = await getVideoInfo(file);
  onProgress?.(`Original: ${info.width}x${info.height} @ ${info.fps.toFixed(1)}fps`);

  const needsResize = info.height > TARGET_HEIGHT;
  const newWidth = needsResize ? Math.round((TARGET_HEIGHT / info.height) * info.width) : info.width;
  const newHeight = needsResize ? TARGET_HEIGHT : info.height;

  // If no resize needed and already at or below 24fps, return original
  if (!needsResize && info.fps <= TARGET_FPS) {
    return { blob: file, originalWidth: info.width, originalHeight: info.height, compressed: false };
  }

  onProgress?.(`Compressing to ${newWidth}x${newHeight} @ ${TARGET_FPS}fps...`);

  // Create offscreen video to decode source
  const video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(TARGET_FPS);
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
    recorder.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Compression failed"));
    };

    video.onloadeddata = async () => {
      const duration = video.duration;
      const frameInterval = 1 / TARGET_FPS;
      const totalFrames = Math.floor(duration * TARGET_FPS);

      // Start recording
      recorder.start();

      // Draw first frame
      video.currentTime = 0;
      await seeked(video);
      ctx.drawImage(video, 0, 0, newWidth, newHeight);

      // Step through each frame at 24fps intervals
      for (let i = 1; i < totalFrames; i++) {
        const targetTime = i * frameInterval;
        if (targetTime >= duration) break;

        video.currentTime = targetTime;
        await seeked(video);
        ctx.drawImage(video, 0, 0, newWidth, newHeight);
      }

      // Ensure recorder has time to process the last frame
      await sleep(100);
      recorder.stop();

      // Estimate FPS for progress
      const estimatedFps = info.fps > TARGET_FPS ? TARGET_FPS : info.fps;
      onProgress?.(`Compressed: ${info.width}x${info.height} → ${newWidth}x${newHeight} @ ${estimatedFps}fps`);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to load video"));
    };

    video.load();

    // Timeout safety
    setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, (video.duration || 120) * 1000 + 30_000);
  });
}

function seeked(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    const handler = () => {
      video.removeEventListener("seeked", handler);
      resolve();
    };
    video.addEventListener("seeked", handler);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function getVideoInfo(file: File): Promise<{ width: number; height: number; fps: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);

    let resolved = false;

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolved = true;

      // Detect actual FPS from the video stream
      detectFps(video).then((fps) => {
        resolve({ width: video.videoWidth, height: video.videoHeight, fps });
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      if (!resolved) reject(new Error("Failed to read video"));
    };
  });
}

async function detectFps(video: HTMLVideoElement): Promise<number> {
  // Try requestVideoFrameCallback for precise measurement
  const rvfc = (video as HTMLVideoElement & {
    requestVideoFrameCallback?: (cb: (now: number, meta: { presentedFrames: number }) => void) => number;
  }).requestVideoFrameCallback;

  if (rvfc) {
    return new Promise<number>((resolve) => {
      let count = 0;
      const start = performance.now();
      const timer = setTimeout(() => {
        const elapsed = (performance.now() - start) / 1000;
        resolve(elapsed > 0 && count > 1 ? count / elapsed : 24);
      }, 2000);

      // Play briefly to get frame callbacks
      video.muted = true;
      video.playsInline = true;

      function loop() {
        rvfc.call(video, () => {
          count++;
          if (count < 100) loop();
        });
      }

      video.play().then(() => {
        rvfc.call(video, () => { count++; loop(); });
      }).catch(() => {
        clearTimeout(timer);
        resolve(24);
      });

      video.onerror = () => { clearTimeout(timer); resolve(24); };
    }).finally(() => video.pause());
  }

  // Fallback: captureStream track settings
  try {
    const stream = (video as unknown as { captureStream?(): MediaStream }).captureStream?.();
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track) {
        const s = track.getSettings();
        if (s.frameRate && s.frameRate > 0) return s.frameRate;
      }
      track?.stop();
    }
  } catch {}

  return 24;
}
