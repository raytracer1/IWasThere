import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const TEMP_DIR = path.join(import.meta.dirname, '..', 'data', 'tmp');
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5 MB

const MIN_HEIGHT = 720;
const TARGET_HEIGHT = 720;
const MIN_FPS = 24;
const TARGET_FPS = 24;

interface VideoInfo {
  width: number;
  height: number;
  fps: number;
}

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/** Probe video metadata using ffprobe */
async function probeVideo(filePath: string): Promise<VideoInfo | null> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'quiet',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,r_frame_rate',
      '-of', 'csv=p=0',
      filePath,
    ], { timeout: 30_000 });

    const parts = stdout.trim().split(',');
    if (parts.length < 3) return null;

    const width = parseInt(parts[0], 10);
    const height = parseInt(parts[1], 10);
    const fpsStr = parts[2];
    const fpsParts = fpsStr.split('/');
    const fps = fpsParts.length === 2
      ? parseInt(fpsParts[0], 10) / parseInt(fpsParts[1], 10)
      : parseFloat(fpsStr);

    if (isNaN(width) || isNaN(height) || isNaN(fps)) return null;
    return { width, height, fps };
  } catch {
    return null;
  }
}

/** Re-encode video to target quality using ffmpeg */
async function reencodeVideo(
  inputPath: string,
  outputPath: string,
  info: VideoInfo
): Promise<boolean> {
  const needsScale = info.height > TARGET_HEIGHT;
  const needsFpsLimit = info.fps > TARGET_FPS + 0.5;

  if (!needsScale && !needsFpsLimit) {
    fs.renameSync(inputPath, outputPath);
    return true;
  }

  const filters: string[] = [];
  if (needsScale) filters.push(`scale=-2:${TARGET_HEIGHT}`);
  if (needsFpsLimit) filters.push(`fps=${TARGET_FPS}`);

  try {
    await execFileAsync('ffmpeg', [
      '-y', '-i', inputPath,
      '-vf', filters.join(','),
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      outputPath,
    ], { timeout: 120_000 });
    try { fs.unlinkSync(inputPath); } catch {}
    return true;
  } catch (err) {
    console.error('   ffmpeg error:', String(err).slice(0, 100));
    try { fs.unlinkSync(outputPath); } catch {}
    return false;
  }
}

/**
 * Download video using yt-dlp. Handles YouTube, Reddit, Twitter, etc.
 * Format: max 720p, mp4, under 100MB.
 */
async function downloadWithYtDlp(url: string, outputPath: string): Promise<boolean> {
  const cookieFile = path.join(import.meta.dirname, '..', 'cookies.txt');
  const args = [
    url,
    '-o', outputPath,
    '--format', 'best[height<=720][ext=mp4]/best[height<=720]/best[ext=mp4]/best',
    '--max-filesize', '100M',
    '--no-playlist',
    '--js-runtimes', 'node',
    '--socket-timeout', '30',
    '--retries', '2',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  ];
  // Use cookies if available
  if (fs.existsSync(cookieFile)) {
    args.push('--cookies', cookieFile);
  }
  try {
    await execFileAsync('yt-dlp', args, { timeout: 120_000 });
    return fs.existsSync(outputPath);
  } catch (err) {
    console.error('   yt-dlp error:', String(err).slice(0, 150));
    return false;
  }
}

/** Direct HTTP download for non-YouTube URLs */
async function downloadDirect(url: string, outputPath: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'HotInsert-Crawler/1.0' },
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok || !response.body) return false;

    const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10);
    if (contentLength > MAX_VIDEO_SIZE) return false;

    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_VIDEO_SIZE) return false;
      chunks.push(value);
    }
    fs.writeFileSync(outputPath, Buffer.concat(chunks));
    return true;
  } catch {
    return false;
  }
}

/**
 * Download video: yt-dlp first, then direct HTTP fallback.
 * Then probe quality and re-encode if needed.
 */
export async function downloadVideo(url: string): Promise<string | null> {
  ensureTempDir();
  const rawPath = path.join(TEMP_DIR, `${randomUUID()}.mp4`);

  // Try yt-dlp first (handles YouTube, Reddit, most platforms)
  const isPageUrl = url.includes('youtube.com') || url.includes('youtu.be')
    || url.includes('reddit.com') || url.includes('redd.it')
    || url.includes('twitter.com') || url.includes('x.com')
    || url.includes('tiktok.com');

  let ok: boolean;
  if (isPageUrl) {
    ok = await downloadWithYtDlp(url, rawPath);
  } else {
    // Direct download for plain video URLs
    ok = await downloadDirect(url, rawPath);
    if (!ok) {
      // Fallback to yt-dlp for unknown URLs
      ok = await downloadWithYtDlp(url, rawPath);
    }
  }

  if (!ok) {
    try { fs.unlinkSync(rawPath); } catch {}
    return null;
  }

  // Probe quality
  const info = await probeVideo(rawPath);
  if (!info) {
    console.log(`   ⚠️  Could not probe, using as-is`);
    return rawPath;
  }

  console.log(`   📐 ${info.width}x${info.height} @ ${info.fps.toFixed(1)}fps`);

  // Reject below thresholds
  if (info.height < MIN_HEIGHT) {
    console.log(`   ❌ ${info.height}p < ${MIN_HEIGHT}p minimum, skipping`);
    try { fs.unlinkSync(rawPath); } catch {}
    return null;
  }
  if (info.fps < MIN_FPS - 0.5) {
    console.log(`   ❌ ${info.fps.toFixed(1)}fps < ${MIN_FPS} minimum, skipping`);
    try { fs.unlinkSync(rawPath); } catch {}
    return null;
  }

  // Re-encode if exceeding targets
  const needsScale = info.height > TARGET_HEIGHT;
  const needsFps = info.fps > TARGET_FPS + 0.5;

  if (needsScale || needsFps) {
    const parts: string[] = [];
    if (needsScale) parts.push(`${info.height}p → ${TARGET_HEIGHT}p`);
    if (needsFps) parts.push(`${info.fps.toFixed(1)}fps → ${TARGET_FPS}fps`);
    console.log(`   🔧 ${parts.join(', ')}`);

    const processed = path.join(TEMP_DIR, `${randomUUID()}.mp4`);
    ok = await reencodeVideo(rawPath, processed, info);
    if (!ok) {
      try { fs.unlinkSync(rawPath); } catch {}
      return null;
    }
    console.log(`   ✅ ${(fs.statSync(processed).size / 1024 / 1024).toFixed(1)} MB`);
    return processed;
  }

  console.log(`   ✅ ${(fs.statSync(rawPath).size / 1024 / 1024).toFixed(1)} MB`);
  return rawPath;
}

/** Download thumbnail image */
export async function downloadThumbnail(url: string): Promise<string | null> {
  ensureTempDir();
  const outputPath = path.join(TEMP_DIR, `${randomUUID()}.jpg`);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'HotInsert-Crawler/1.0' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok || !response.body) return null;
    if (parseInt(response.headers.get('content-length') ?? '0', 10) > MAX_IMAGE_SIZE) return null;

    const buf = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buf);
    return outputPath;
  } catch {
    try { fs.unlinkSync(outputPath); } catch {}
    return null;
  }
}

/** Clean up temp files */
export function cleanupTemp(): void {
  try {
    for (const file of fs.readdirSync(TEMP_DIR)) {
      try { fs.unlinkSync(path.join(TEMP_DIR, file)); } catch {}
    }
  } catch {}
}
