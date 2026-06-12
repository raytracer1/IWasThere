/**
 * CCTV5 直播录制
 * 一个 ffmpeg 进程：WebM(Canvas) + HLS 音频 → segment 轮转 mp4
 * 无需重启，无间隙。
 */

import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { startCapture, stopCapture } from './sources/cctv5_browser';
import { getCCTV5StreamUrl } from './sources/cctv5';

const SEGMENT_TIME = 300;
const SEGMENT_WRAP = 2;
const HEARTBEAT_INTERVAL_MS = 15_000;

const BUFFER_DIR = path.join(import.meta.dirname, '..', 'data', 'cctv5_buffer');

let ffmpegProc: ChildProcess | null = null;
let isRunning = false;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let fileRecords: { file: string; utcMs: number }[] = [];

export async function startRecording(): Promise<void> {
  if (isRunning) return;
  ensureBufferDir();
  console.log('🎬 Starting CCTV5 recorder...');

  const { hlsUrl } = await getCCTV5StreamUrl();

  await startCapture({
    onChunk: (base64: string) => {
      if (ffmpegProc?.stdin?.writable) {
        ffmpegProc.stdin.write(Buffer.from(base64, 'base64'));
      }
    },
  });

  launchSegmentEncoder(hlsUrl);
  isRunning = true;

  heartbeatTimer = setInterval(async () => {
    if (!isFfmpegAlive() && isRunning) {
      console.warn('⚠️  Encoder died, restarting...');
      killFfmpeg();
      await new Promise(r => setTimeout(r, 500));
      const { hlsUrl: newUrl } = await getCCTV5StreamUrl();
      launchSegmentEncoder(newUrl);
    }
  }, HEARTBEAT_INTERVAL_MS);
}

export function stopRecording(): void {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  killFfmpeg();
  stopCapture().catch(() => {});
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

  console.log(`  🎯 offset ${startSec.toFixed(0)}s | duration ${beforeSec + afterSec}s`);

  const outPath = path.join(BUFFER_DIR, `clip_${randomUUID()}.mp4`);
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');

  try {
    await promisify(execFile)('ffmpeg', [
      '-y', '-ss', String(startSec), '-i', rec.file,
      '-t', String(beforeSec + afterSec), '-c', 'copy', outPath,
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
  launchSegmentEncoder(hlsUrl);
}

// ─── 内部 ───────────────────────────────────────

function ensureBufferDir(): void {
  if (!fs.existsSync(BUFFER_DIR)) fs.mkdirSync(BUFFER_DIR, { recursive: true });
}

function launchSegmentEncoder(hlsUrl: string): void {
  // 清空旧记录
  fileRecords = [];
  cleanupSegments();

  ffmpegProc = spawn('ffmpeg', [
    '-f', 'webm', '-i', 'pipe:0',
    '-i', hlsUrl,
    '-map', '0:v', '-map', '1:a:0',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
    '-c:a', 'aac', '-b:a', '128k',
    '-f', 'segment',
    '-segment_time', String(SEGMENT_TIME),
    '-segment_wrap', String(SEGMENT_WRAP),
    '-reset_timestamps', '1',
    '-movflags', '+faststart',
    path.join(BUFFER_DIR, 'cctv5_%d.mp4'),
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

  // 追踪文件
  trackSegments();

  console.log(`  📡 Recording (segment ${SEGMENT_TIME}s, wrap ${SEGMENT_WRAP})`);
}

function trackSegments(): void {
  const seen = new Set<string>();
  const timer = setInterval(() => {
    if (!isRunning || !isFfmpegAlive()) {
      clearInterval(timer);
      return;
    }
    try {
      for (const f of fs.readdirSync(BUFFER_DIR)) {
        if (f.match(/^cctv5_\d+\.mp4$/) && !seen.has(f)) {
          seen.add(f);
          fileRecords.push({
            file: path.join(BUFFER_DIR, f),
            utcMs: Date.now(),
          });
          console.log(`  📄 New segment: ${f}`);
        }
      }
      // 只保留最近几个记录
      if (fileRecords.length > SEGMENT_WRAP + 2) {
        fileRecords = fileRecords.slice(-(SEGMENT_WRAP + 2));
      }
    } catch {}
  }, 5000);
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

function cleanupSegments(): void {
  try {
    for (const f of fs.readdirSync(BUFFER_DIR)) {
      if (f.match(/^cctv5_\d+\.mp4$/) || f.startsWith('clip_')) {
        fs.unlinkSync(path.join(BUFFER_DIR, f));
      }
    }
  } catch {}
}
