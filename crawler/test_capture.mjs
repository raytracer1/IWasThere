import { startCapture, stopCapture } from './src/sources/cctv5_browser.ts';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const chunks = [];
let totalBytes = 0;

console.log('Starting capture test...');
await startCapture({
  onChunk: (base64) => {
    const buf = Buffer.from(base64, 'base64');
    chunks.push(buf);
    totalBytes += buf.length;
    process.stdout.write(`\r  Received: ${(totalBytes / 1024).toFixed(0)} KB (${chunks.length} chunks)`);
  },
});

// 录 20 秒
await new Promise(r => setTimeout(r, 20000));
await stopCapture();

console.log(`\nTotal: ${(totalBytes / 1024 / 1024).toFixed(1)} MB, ${chunks.length} chunks`);

// 保存 WebM
const webmPath = '/tmp/cctv5_test.webm';
fs.writeFileSync(webmPath, Buffer.concat(chunks));
console.log(`WebM: ${webmPath} (${(fs.statSync(webmPath).size / 1024 / 1024).toFixed(1)} MB)`);

// ffprobe
console.log('\n=== WebM info ===');
const ffprobe = spawn('ffprobe', ['-v', 'error', '-show_streams', webmPath], { stdio: 'pipe' });
let out = '';
ffprobe.stdout.on('data', d => out += d);
await new Promise(r => ffprobe.on('exit', r));
console.log(out.split('\n').filter(l => l.includes('codec') || l.includes('fps') || l.includes('width')).join('\n'));

// 转 mp4
console.log('\n=== Converting to mp4 ===');
const mp4Path = '/tmp/cctv5_test.mp4';
const ffmpeg = spawn('ffmpeg', [
  '-y', '-i', webmPath,
  '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
  '-c:a', 'aac', '-b:a', '128k',
  '-movflags', '+faststart',
  mp4Path,
], { stdio: 'inherit' });
await new Promise(r => ffmpeg.on('exit', r));

console.log('\n=== MP4 info ===');
const ffprobe2 = spawn('ffprobe', ['-v', 'error', '-show_streams', mp4Path], { stdio: 'pipe' });
let out2 = '';
ffprobe2.stdout.on('data', d => out2 += d);
await new Promise(r => ffprobe2.on('exit', r));
console.log(out2.split('\n').filter(l => l.includes('codec') || l.includes('fps') || l.includes('width') || l.includes('duration=')).join('\n'));

console.log(`\nMP4: ${mp4Path} (${(fs.statSync(mp4Path).size / 1024 / 1024).toFixed(1)} MB)`);
console.log('✅ Test complete');
