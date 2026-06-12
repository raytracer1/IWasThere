/**
 * Chrome 打开 CCTV5 → Canvas 捕获 MSE 视频流
 *
 * CCTV5 用 Media Source Extensions 喂流，video.captureStream() 对 MSE 无效。
 * 解决：每帧 drawImage 到 Canvas，从 Canvas 拿 captureStream(25fps)。
 */

import puppeteer from 'puppeteer-core';

const CCTV5_PAGE = 'https://tv.cctv.com/live/cctv5/';

let browser: any = null;
let page: any = null;
let isCapturing = false;

export interface CaptureCallbacks {
  onChunk: (base64: string) => void;
}

export async function startCapture(callbacks: CaptureCallbacks): Promise<void> {
  if (isCapturing) return;

  console.log('  🌐 Launching Chrome...');
  browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', '--disable-gpu',
      '--autoplay-policy=no-user-gesture-required',
      '--window-size=1280,720',
    ],
  });

  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  console.log('  📄 Loading page...');
  await page.goto(CCTV5_PAGE, { waitUntil: 'networkidle2', timeout: 30_000 });

  console.log('  ⏳ Waiting for video...');
  await page.waitForSelector('video', { timeout: 15_000 });
  await page.waitForFunction(`(()=>{const v=document.querySelector('video');return v&&v.readyState>=3&&!v.paused})()`, { timeout: 20_000 });
  console.log('  ✅ Video playing');

  // 暴露回调
  await page.exposeFunction('__cctv5Chunk', (base64: string) => {
    callbacks.onChunk(base64);
  });

  // Canvas 捕获视频（音频从 HLS 单独录制）
  await page.evaluate(`(async () => {
    const video = document.querySelector('video');
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    function draw() {
      if (video.readyState >= 2) ctx.drawImage(video, 0, 0, 1280, 720);
      requestAnimationFrame(draw);
    }
    draw();

    const stream = canvas.captureStream(25);
    const recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8',
      videoBitsPerSecond: 2500000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          window.__cctv5Chunk(base64);
        };
        reader.readAsDataURL(e.data);
      }
    };

    recorder.start(1000);
    window.__cctv5Recorder = recorder;
  })()`);

  isCapturing = true;
  console.log('  🎥 Canvas captureStream active @ 25fps');
}

export async function stopCapture(): Promise<void> {
  isCapturing = false;
  if (page) {
    try {
      await page.evaluate(`(function(){if(window.__cctv5Recorder){window.__cctv5Recorder.stop()}})()`);
    } catch {}
    try { await page.close(); } catch {}; page = null;
  }
  if (browser) {
    try { await browser.close(); } catch {}; browser = null;
  }
  console.log('  🎥 Capture stopped');
}

export function isCaptureRunning(): boolean { return isCapturing; }
