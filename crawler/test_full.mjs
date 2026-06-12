import { startCapture, stopCapture } from './src/sources/cctv5_browser.ts';
import { getCCTV5StreamUrl } from './src/sources/cctv5.ts';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

// 1. 获取 HLS URL
const { hlsUrl } = await getCCTV5StreamUrl();
console.log('HLS:', hlsUrl.slice(0, 80));

// 2. 收集 WebM chunks
const chunks = [];
let totalBytes = 0;

console.log('Starting canvas capture...');
await startCapture({
  onChunk: (base64) => {
    const buf = Buffer.from(base64, 'base64');
    chunks.push(buf);
    totalBytes += buf.length;
    process.stdout.write(`\r  ${(totalBytes / 1024).toFixed(0)} KB (${chunks.length} chunks)`);
  },
});

// 录 15 秒
await new Promise(r => setTimeout(r, 15000));
await stopCapture();

console.log(`\nVideo: ${(totalBytes / 1024 / 1024).toFixed(1)} MB, ${chunks.length} chunks`);

if (totalBytes === 0) { console.log('❌ No video data'); process.exit(1); }

// 3. 保存 WebM
const webmPath = '/tmp/cctv5_full_test.webm';
fs.writeFileSync(webmPath, Buffer.concat(chunks));

// 4. 用 ffmpeg 合并视频(WebM) + 音频(HLS) → mp4
console.log('Converting with audio...');
const ffmpeg = spawn('ffmpeg', [
  '-y',
  '-i', webmPath,
  '-ss', '2',
  '-i', hlsUrl,
  '-t', '12',
  '-map', '0:v', '-map', '1:a:0',
  '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
  '-c:a', 'aac', '-b:a', '128k',
  '-shortest',
  '-movflags', '+faststart',
  '/tmp/cctv5_full_test.mp4',
], { stdio: 'inherit' });

await new Promise(r => ffmpeg.on('exit', r));

if (!fs.existsSync('/tmp/cctv5_full_test.mp4')) {
  console.log('❌ MP4 not created');
  process.exit(1);
}

// 5. 验证
console.log(`\nMP4: ${(fs.statSync('/tmp/cctv5_full_test.mp4').size / 1024 / 1024).toFixed(1)} MB`);
const probe = spawn('ffprobe', ['-v', 'error', '-show_streams', '/tmp/cctv5_full_test.mp4'], { stdio: 'pipe' });
let out = '';
probe.stdout.on('data', d => out += d);
await new Promise(r => probe.on('exit', r));

const hasVideo = out.includes('codec_name=h264');
const hasAudio = out.includes('codec_name=aac');
console.log(`Video: ${hasVideo ? '✅' : '❌'}  Audio: ${hasAudio ? '✅' : '❌'}`);
console.log('File: /tmp/cctv5_full_test.mp4');
