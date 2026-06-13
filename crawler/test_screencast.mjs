import { startCapture, stopCapture } from './src/sources/cctv5_browser.ts';
import { getCCTV5StreamUrl } from './src/sources/cctv5.ts';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

// 获取 HLS URL 用于音频
const { hlsUrl } = await getCCTV5StreamUrl();
console.log('HLS:', hlsUrl.slice(0, 80));

// 启动 ffmpeg：screencast 帧 + HLS 音频 → mp4
const ffmpeg = spawn('ffmpeg', [
  '-f', 'image2pipe', '-use_wallclock_as_timestamps', '1', '-i', 'pipe:0',
  '-i', hlsUrl,
  '-map', '0:v', '-map', '1:a:0',
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '128k',
  '-t', '20',
  '-shortest',
  '-movflags', '+faststart',
  '-y', '/tmp/cctv5_screencast_test.mp4',
], { stdio: ['pipe', 'pipe', 'pipe'] });

ffmpeg.stderr.on('data', d => {
  const m = d.toString();
  if (m.includes('Error')) console.error('ffmpeg:', m.slice(0, 100));
});

let frameCount = 0;
await startCapture({
  onFrame: (jpegBuf) => {
    frameCount++;
    if (ffmpeg.stdin.writable) ffmpeg.stdin.write(jpegBuf);
  },
});

// 等 ffmpeg 完成（-t 20）
await new Promise(r => ffmpeg.on('exit', r));
await stopCapture();

console.log(`Frames: ${frameCount}`);
console.log('File size:', (fs.statSync('/tmp/cctv5_screencast_test.mp4').size / 1024 / 1024).toFixed(1), 'MB');

// 验证
const probe = spawn('ffprobe', ['-v', 'error', '-show_streams', '/tmp/cctv5_screencast_test.mp4'], { stdio: 'pipe' });
let out = '';
probe.stdout.on('data', d => out += d);
await new Promise(r => probe.on('exit', r));
const lines = out.split('\n').filter(l => l.includes('codec') || l.includes('duration=') || l.includes('width'));
console.log(lines.join('\n'));
