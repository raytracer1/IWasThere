/**
 * CCTV5 直播录制
 * 比赛开始时启动，结束时停止。每场比赛一个文件。
 */

import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { startCapture, stopCapture } from './sources/cctv5_browser';
import { getCCTV5StreamUrl } from './sources/cctv5';

const HEARTBEAT_INTERVAL_MS = 15_000;

const BUFFER_DIR = path.join(import.meta.dirname, '..', 'data', 'cctv5_buffer');

let ffmpegProc: ChildProcess | null = null;
let isRunning = false;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let currentFile: string | null = null;
let fileStartUtcMs: number = 0;
let hlsUrlCache: string | null = null;

export async function startRecording(matchLabel?: string): Promise<void> {
  if (isRunning) return;
  ensureBufferDir();
  const tag = matchLabel ? ` [${matchLabel}]` : '';
  console.log(`🎬 Starting CCTV5 recorder${tag}...`);

  const { hlsUrl } = await getCCTV5StreamUrl();
  hlsUrlCache = hlsUrl;

  await startCapture({
    onChunk: (base64: string) => {
      if (ffmpegProc?.stdin?.writable) {
        ffmpegProc.stdin.write(Buffer.from(base64, 'base64'));
      }
    },
  });

  currentFile = path.join(BUFFER_DIR, `cctv5_${Date.now()}.ts`);
  fileStartUtcMs = Date.now();
  launchEncoder(hlsUrl);
  isRunning = true;

  heartbeatTimer = setInterval(async () => {
    if (!isFfmpegAlive() && isRunning) {
      console.warn('⚠️  Encoder died, restarting...');
      killFfmpeg();
      await new Promise(r => setTimeout(r, 500));
      if (hlsUrlCache) launchEncoder(hlsUrlCache);
    }
  }, HEARTBEAT_INTERVAL_MS);
}

export function stopRecording(): void {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  killFfmpeg();
  stopCapture().catch(() => {});
  isRunning = false;
  if (currentFile) {
    console.log(`⏹️  Stopped → ${path.basename(currentFile)}`);
  }
}

export async function extractClipByUtc(
  goalUtcMs: number, beforeSec = 60, afterSec = 120,
): Promise<string | null> {
  if (!currentFile || !fs.existsSync(currentFile)) {
    console.log('  ⚠️  Recording file not available');
    return null;
  }

  const offsetSec = (goalUtcMs - fileStartUtcMs) / 1000 - beforeSec;
  const startSec = Math.max(0, offsetSec);
  const durationSec = beforeSec + afterSec;

  console.log(`  🎯 offset ${startSec.toFixed(0)}s | duration ${durationSec}s`);

  const outPath = path.join(BUFFER_DIR, `clip_${randomUUID()}.mp4`);
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');

  try {
    await promisify(execFile)('ffmpeg', [
      '-y', '-ss', String(startSec), '-i', currentFile,
      '-t', String(durationSec),
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      outPath,
    ], { timeout: 60_000 });

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

export function getCurrentFile(): string | null { return currentFile; }
export function getFileStartUtcMs(): number { return fileStartUtcMs; }

export async function reloadRecorder(): Promise<void> {
  killFfmpeg();
  const { hlsUrl } = await getCCTV5StreamUrl();
  hlsUrlCache = hlsUrl;
  launchEncoder(hlsUrl);
}

// ─── 内部 ───────────────────────────────────────

function ensureBufferDir(): void {
  if (!fs.existsSync(BUFFER_DIR)) fs.mkdirSync(BUFFER_DIR, { recursive: true });
}

function launchEncoder(hlsUrl: string): void {
  if (!currentFile) return;

  ffmpegProc = spawn('ffmpeg', [
    '-f', 'webm', '-i', 'pipe:0',
    '-i', hlsUrl,
    '-map', '0:v', '-map', '1:a:0',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
    '-c:a', 'aac', '-b:a', '128k',
    '-f', 'mpegts',
    '-y', currentFile,
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  ffmpegProc.stderr?.on('data', (d: Buffer) => {
    const m = d.toString();
    if (m.includes('Error')) console.error('  ffmpeg:', m.slice(0, 150));
  });

  ffmpegProc.on('exit', (code) => {
    if (code !== null && code !== 0 && code !== 143) {
      console.warn(`  ffmpeg exit ${code}`);
    }
  });

  ffmpegProc.stdin.on('error', (e: any) => {
    if (e.code !== 'EPIPE') console.error('  stdin:', e.message);
  });

  console.log(`  📡 Recording → ${path.basename(currentFile)}`);
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
