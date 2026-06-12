/**
 * CCTV5 直播录制模块
 * 视频：Chrome screencast JPEG 帧 → 音频：HLS 流 → ffmpeg 合并编码为 mp4
 */

import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { startScreencast, stopScreencast } from './sources/cctv5_browser';
import { getCCTV5StreamUrl } from './sources/cctv5';

const FILE_DURATION_SEC = 300;
const KEEP_FILES = 2;
const RESTART_INTERVAL_MS = 25 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 15_000;

const BUFFER_DIR = path.join(import.meta.dirname, '..', 'data', 'cctv5_buffer');

let ffmpegProc: ChildProcess | null = null;
let isRunning = false;
let restartTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let hlsUrlCache: string | null = null;

const fileRecords: { file: string; utcMs: number }[] = [];

// ─── 公开 API ──────────────────────────────────

export async function startRecording(): Promise<void> {
  if (isRunning) return;
  ensureBufferDir();
  console.log('🎬 Starting CCTV5 recorder...');

  const { hlsUrl } = await getCCTV5StreamUrl();
  hlsUrlCache = hlsUrl;

  await startScreencastWithBuffer();
  launchEncoder(hlsUrl);
  isRunning = true;

  restartTimer = setInterval(async () => {
    try {
      console.log('🔄 Restarting...');
      const { hlsUrl: newUrl } = await getCCTV5StreamUrl();
      hlsUrlCache = newUrl;
      await stopScreencast();
      await new Promise(r => setTimeout(r, 2000));
      await startScreencastWithBuffer();
      killFfmpeg();
      await new Promise(r => setTimeout(r, 500));
      launchEncoder(newUrl);
    } catch (err) {
      console.error('Restart failed:', String(err).slice(0, 100));
    }
  }, RESTART_INTERVAL_MS);

  heartbeatTimer = setInterval(async () => {
    const lastRec = fileRecords.length > 0 ? fileRecords[fileRecords.length - 1].utcMs : 0;
    if (!isFfmpegAlive() && isRunning && Date.now() - lastRec > 60_000) {
      console.warn('⚠️  Encoder stuck, restarting...');
      killFfmpeg();
      await new Promise(r => setTimeout(r, 500));
      if (hlsUrlCache) launchEncoder(hlsUrlCache);
    }
  }, HEARTBEAT_INTERVAL_MS);
}

export function stopRecording(): void {
  if (restartTimer) { clearInterval(restartTimer); restartTimer = null; }
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  killFfmpeg();
  stopScreencast().catch(() => {});
  isRunning = false;
  console.log('⏹️  Stopped');
}

export async function extractClipByUtc(
  goalUtcMs: number, beforeSec = 60, afterSec = 120,
): Promise<string | null> {
  const rec = findFileForTime(goalUtcMs);
  if (!rec) { console.log('  ⚠️  No file covers target time'); return null; }

  const offsetSec = (goalUtcMs - rec.utcMs) / 1000 - beforeSec;
  const startSec = Math.max(0, offsetSec);
  const durationSec = beforeSec + afterSec;

  console.log(`  🎯 Goal ~${((Date.now() - goalUtcMs)/1000).toFixed(0)}s ago | offset ${startSec.toFixed(0)}s | duration ${durationSec}s`);

  const outPath = path.join(BUFFER_DIR, `clip_${randomUUID()}.mp4`);
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');

  try {
    await promisify(execFile)('ffmpeg', [
      '-y', '-ss', String(startSec), '-i', rec.file,
      '-t', String(durationSec), '-c', 'copy',
      '-avoid_negative_ts', 'make_zero', outPath,
    ], { timeout: 30_000 });

    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1024) {
      console.log(`     Output: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(1)} MB`);
      return outPath;
    }
  } catch (err) {
    console.error('  extract error:', String(err).slice(0, 100));
  }
  try { fs.unlinkSync(outPath); } catch {}
  return null;
}

export function isRecorderRunning(): boolean { return isRunning; }

export async function reloadRecorder(): Promise<void> {
  killFfmpeg();
  const { hlsUrl } = await getCCTV5StreamUrl();
  hlsUrlCache = hlsUrl;
  await stopScreencast();
  await new Promise(r => setTimeout(r, 2000));
  await startScreencastWithBuffer();
  launchEncoder(hlsUrl);
}

// ─── 内部 ───────────────────────────────────────

function ensureBufferDir(): void {
  if (!fs.existsSync(BUFFER_DIR)) fs.mkdirSync(BUFFER_DIR, { recursive: true });
}

async function startScreencastWithBuffer(): Promise<void> {
  const queue: Buffer[] = [];
  let ready = false;

  await startScreencast({
    onFrame: (jpegBuf: Buffer) => {
      if (ready && ffmpegProc?.stdin?.writable) {
        ffmpegProc.stdin.write(jpegBuf);
      } else if (queue.length < 100) {
        queue.push(jpegBuf);
      }
    },
  });

  setTimeout(() => {
    ready = true;
    if (ffmpegProc?.stdin?.writable) {
      for (const buf of queue) ffmpegProc.stdin.write(buf);
      queue.length = 0;
    }
  }, 2000);
}

function launchEncoder(hlsUrl: string): void {
  const outFile = path.join(BUFFER_DIR, `cctv5_${Date.now()}.mp4`);
  fileRecords.push({ file: outFile, utcMs: Date.now() });
  pruneFiles();

  ffmpegProc = spawn('ffmpeg', [
    '-f', 'image2pipe', '-framerate', '10', '-i', 'pipe:0',
    '-i', hlsUrl,
    '-map', '0:v', '-map', '1:a:0',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-t', String(FILE_DURATION_SEC),
    '-shortest',
    '-movflags', '+faststart',
    '-y', outFile,
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  ffmpegProc.stderr?.on('data', (d: Buffer) => {
    const m = d.toString();
    if (m.includes('Error')) console.error('  ffmpeg:', m.slice(0, 150));
  });

  ffmpegProc.on('exit', (code) => {
    if (code === 0) {
      console.log(`  📄 Done → ${path.basename(outFile)}`);
      if (isRunning && hlsUrlCache) launchEncoder(hlsUrlCache);
    } else if (code !== null && code !== 143) {
      console.warn(`  ffmpeg exit ${code}`);
    }
  });

  ffmpegProc.stdin.on('error', (e: any) => {
    if (e.code !== 'EPIPE') console.error('  stdin:', e.message);
  });

  console.log(`  📡 Recording → ${path.basename(outFile)} (${FILE_DURATION_SEC}s)`);
}

function killFfmpeg(): void {
  if (ffmpegProc) {
    try { ffmpegProc.stdin.end(); } catch {}
    ffmpegProc.kill('SIGTERM');
    ffmpegProc = null;
  }
}

function isFfmpegAlive(): boolean {
  return ffmpegProc !== null && ffmpegProc.exitCode === null;
}

function findFileForTime(targetUtcMs: number): typeof fileRecords[0] | null {
  let best: typeof fileRecords[0] | null = null;
  let bestStart = 0;
  for (const r of fileRecords) {
    if (r.utcMs <= targetUtcMs && r.utcMs > bestStart && fs.existsSync(r.file)) {
      best = r;
      bestStart = r.utcMs;
    }
  }
  return best;
}

function pruneFiles(): void {
  while (fileRecords.length > KEEP_FILES) {
    const old = fileRecords.shift();
    if (old) try { fs.unlinkSync(old.file); } catch {}
  }
  try {
    for (const f of fs.readdirSync(BUFFER_DIR)) {
      if (f.startsWith('clip_')) {
        const full = path.join(BUFFER_DIR, f);
        if (Date.now() - fs.statSync(full).mtimeMs > 10 * 60 * 1000) fs.unlinkSync(full);
      }
    }
  } catch {}
}
