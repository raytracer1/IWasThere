import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const TEMP_DIR = path.join(import.meta.dirname, '..', 'data', 'tmp');
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const MIN_HEIGHT = 720;
const TARGET_HEIGHT = 720;
const MIN_FPS = 24;
const TARGET_FPS = 24;

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) { fs.mkdirSync(TEMP_DIR, { recursive: true }); }
}

interface VideoInfo {
  width: number;
  height: number;
  fps: number;
}

async function probeVideo(filePath: string): Promise<VideoInfo | null> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'quiet', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,r_frame_rate',
      '-of', 'csv=p=0', filePath,
    ], { timeout: 30_000 });
    const parts = stdout.trim().split(',');
    if (parts.length < 3) return null;
    const w = parseInt(parts[0]), h = parseInt(parts[1]);
    const [num, den] = parts[2].split('/');
    const fps = den ? parseInt(num) / parseInt(den) : parseFloat(parts[2]);
    if (isNaN(w) || isNaN(h) || isNaN(fps)) return null;
    return { width: w, height: h, fps };
  } catch { return null; }
}

async function reencode(inputPath: string, outputPath: string, info: VideoInfo): Promise<boolean> {
  const scale = info.height > TARGET_HEIGHT;
  const fps = info.fps > TARGET_FPS + 0.5;
  if (!scale && !fps) { fs.renameSync(inputPath, outputPath); return true; }
  const filters: string[] = [];
  if (scale) filters.push(`scale=-2:${TARGET_HEIGHT}`);
  if (fps) filters.push(`fps=${TARGET_FPS}`);
  try {
    await execFileAsync('ffmpeg', [
      '-y', '-i', inputPath, '-vf', filters.join(','),
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
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

/** Download video with yt-dlp (handles YouTube, Bilibili, Reddit, etc.) */
async function downloadWithYtDlp(url: string, outputPath: string): Promise<boolean> {
  const cookieFile = path.join(import.meta.dirname, '..', 'cookies.txt');
  const args = [
    url, '-o', outputPath,
    '--format', 'best[height<=720][ext=mp4]/best[height<=720]/best[ext=mp4]/best',
    '--max-filesize', '100M', '--no-playlist',
    '--js-runtimes', 'node',
    '--socket-timeout', '30', '--retries', '2',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  ];
  if (fs.existsSync(cookieFile)) args.push('--cookies', cookieFile);
  try {
    await execFileAsync('yt-dlp', args, { timeout: 120_000 });
    return fs.existsSync(outputPath);
  } catch (err) {
    console.error('   yt-dlp error:', String(err).slice(0, 150));
    return false;
  }
}

/** Direct HTTP download */
async function downloadDirect(url: string, outputPath: string, maxSize: number): Promise<boolean> {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'HotInsert-Crawler/1.0' },
      signal: AbortSignal.timeout(120_000),
    });
    if (!r.ok || !r.body) return false;
    const cl = parseInt(r.headers.get('content-length') ?? '0');
    if (cl > maxSize) return false;
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = r.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxSize) return false;
      chunks.push(value);
    }
    fs.writeFileSync(outputPath, Buffer.concat(chunks));
    return true;
  } catch { return false; }
}

/** Extract a frame from video as thumbnail using ffmpeg */
async function extractThumbnail(videoPath: string, outputPath: string): Promise<boolean> {
  try {
    await execFileAsync('ffmpeg', [
      '-y', '-i', videoPath,
      '-ss', '00:00:01',        // 1 second in
      '-vframes', '1',
      '-vf', 'scale=640:360',    // small thumbnail
      outputPath,
    ], { timeout: 15_000 });
    return fs.existsSync(outputPath);
  } catch { return false; }
}

// ─── Public API ──────────────────────────────────────────

export async function downloadVideo(url: string): Promise<string | null> {
  ensureTempDir();
  const rawPath = path.join(TEMP_DIR, `${randomUUID()}.mp4`);
  const isPage = url.includes('youtube.com') || url.includes('youtu.be')
    || url.includes('reddit.com') || url.includes('redd.it')
    || url.includes('bilibili.com') || url.includes('twitter.com') || url.includes('x.com')
    || url.includes('tiktok.com');

  let ok = isPage ? await downloadWithYtDlp(url, rawPath) : await downloadDirect(url, rawPath, MAX_VIDEO_SIZE);
  if (!ok) ok = await downloadWithYtDlp(url, rawPath); // fallback
  if (!ok) { try { fs.unlinkSync(rawPath); } catch {} return null; }

  // Reject tiny files (< 5 MB likely not a real video, e.g. news article page)
  const size = fs.statSync(rawPath).size;
  if (size < 5 * 1024 * 1024) {
    console.log(`   ❌ Too small (${(size / 1024).toFixed(0)} KB), not a real video`);
    try { fs.unlinkSync(rawPath); } catch {}
    return null;
  }

  const info = await probeVideo(rawPath);
  if (!info) { console.log('   ⚠️  Could not probe, using as-is'); return rawPath; }
  console.log(`   📐 ${info.width}x${info.height} @ ${info.fps.toFixed(1)}fps`);

  if (info.height < MIN_HEIGHT) { console.log(`   ❌ < ${MIN_HEIGHT}p`); try { fs.unlinkSync(rawPath); } catch {} return null; }
  if (info.fps < MIN_FPS - 0.5) { console.log(`   ❌ < ${MIN_FPS}fps`); try { fs.unlinkSync(rawPath); } catch {} return null; }

  if (info.height > TARGET_HEIGHT || info.fps > TARGET_FPS + 0.5) {
    const msg = `${info.height}p→${TARGET_HEIGHT}p, ${info.fps.toFixed(1)}fps→${TARGET_FPS}fps`;
    console.log(`   🔧 ${msg}`);
    const out = path.join(TEMP_DIR, `${randomUUID()}.mp4`);
    if (!(await reencode(rawPath, out, info))) { try { fs.unlinkSync(rawPath); } catch {} return null; }
    console.log(`   ✅ ${(fs.statSync(out).size / 1024 / 1024).toFixed(1)} MB`);
    return out;
  }
  console.log(`   ✅ ${(fs.statSync(rawPath).size / 1024 / 1024).toFixed(1)} MB`);
  return rawPath;
}

export async function downloadThumbnail(thumbnailUrl?: string, videoPath?: string): Promise<string | null> {
  ensureTempDir();
  const outPath = path.join(TEMP_DIR, `${randomUUID()}.jpg`);

  // Strategy 1: download from URL
  if (thumbnailUrl) {
    if (await downloadDirect(thumbnailUrl, outPath, MAX_IMAGE_SIZE)) return outPath;
  }

  // Strategy 2: extract frame from video
  if (videoPath && fs.existsSync(videoPath)) {
    if (await extractThumbnail(videoPath, outPath)) {
      console.log('   🎞️  Extracted thumbnail from video');
      return outPath;
    }
  }

  return null;
}

export function cleanupTemp(): void {
  try { for (const f of fs.readdirSync(TEMP_DIR)) { try { fs.unlinkSync(path.join(TEMP_DIR, f)); } catch {} } } catch {}
}
