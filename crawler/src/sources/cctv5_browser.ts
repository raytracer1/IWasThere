/**
 * Chrome 浏览器打开 CCTV5 → screencast 捕获解密后画面
 */

import puppeteer from 'puppeteer-core';
import type { CDPSession } from 'puppeteer-core';

const CCTV5_PAGE = 'https://tv.cctv.com/live/cctv5/';

let browser: any = null;
let page: any = null;
let cdpSession: CDPSession | null = null;
let isCapturing = false;

export interface ScreencastCallbacks {
  onFrame: (jpegBuffer: Buffer) => void;
  onStatus?: (status: string) => void;
}

export async function startScreencast(callbacks: ScreencastCallbacks): Promise<void> {
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

  // 只加载关键资源
  await page.setRequestInterception(true);
  page.on('request', (req: any) => {
    const t = req.resourceType();
    if (t === 'image' || t === 'font' || t === 'stylesheet') {
      req.abort();
    } else {
      req.continue();
    }
  });

  console.log('  📄 Loading page...');
  await page.goto(CCTV5_PAGE, { waitUntil: 'networkidle2', timeout: 30_000 });

  // 等视频开始播放
  console.log('  ⏳ Waiting for video...');
  try {
    await page.waitForSelector('video', { timeout: 15_000 });
    await page.waitForFunction(`(()=>{const v=document.querySelector('video');return v&&v.readyState>=3&&!v.paused})()`, { timeout: 20_000 });
    console.log('  ✅ Video playing');
  } catch {
    console.warn('  ⚠️  Video wait timeout, continuing...');
  }

  // 启动 screencast
  cdpSession = await page.createCDPSession();
  await cdpSession.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 80,
    maxWidth: 1280,
    maxHeight: 720,
    everyNthFrame: 1,
  });

  cdpSession.on('Page.screencastFrame', async (frame: any) => {
    if (!isCapturing) return;
    try {
      const buf = Buffer.from(frame.data, 'base64');
      callbacks.onFrame(buf);
      await cdpSession!.send('Page.screencastFrameAck', { sessionId: frame.sessionId });
    } catch {}
  });

  isCapturing = true;
  console.log('  📸 Screencast active');
}

export async function stopScreencast(): Promise<void> {
  isCapturing = false;
  if (cdpSession) {
    try { await cdpSession.send('Page.stopScreencast'); } catch {}
    cdpSession = null;
  }
  if (page) { try { await page.close(); } catch {}; page = null; }
  if (browser) { try { await browser.close(); } catch {}; browser = null; }
  console.log('  📸 Screencast stopped');
}

export function isScreencastRunning(): boolean { return isCapturing; }
