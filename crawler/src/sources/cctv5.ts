/**
 * CCTV5 直播流 HLS 地址获取模块
 *
 * CCTV5 的 live API 需要浏览器生成的 auth-key header。
 * 用 puppeteer 打开页面，拦截 API 响应拿到 m3u8 地址。
 * 实际 TS 流没有加密（cdrm 只是路径名），ffmpeg 可以直接录制。
 */

import puppeteer from 'puppeteer-core';

const CCTV5_PAGE = 'https://tv.cctv.com/live/cctv5/';
const API_PATTERN = 'vdnx.live.cntv.cn/api/v3/vdn/live';
const URL_CACHE_TTL_MS = 30 * 60 * 1000; // 30 分钟刷新一次

interface Cctv5StreamInfo {
  hlsUrl: string;
  backupUrl: string | null;
  channel: string;
  fetchedAt: number;
}

let cachedUrl: Cctv5StreamInfo | null = null;

/**
 * 通过 headless Chrome 打开 CCTV5 页面，从 API 响应中提取 m3u8 地址。
 * 结果会缓存 30 分钟。
 */
export async function getCCTV5StreamUrl(): Promise<Cctv5StreamInfo> {
  if (cachedUrl && Date.now() - cachedUrl.fetchedAt < URL_CACHE_TTL_MS) {
    return cachedUrl;
  }

  console.log('  🌐 Launching Chrome to fetch CCTV5 HLS URL...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  let hlsUrl: string | null = null;
  let backupUrl: string | null = null;
  let channel = 'cctv5';

  try {
    const page = await browser.newPage();

    // 拦截 API 响应拿 m3u8 地址
    page.on('response', async (resp) => {
      const url = resp.url();
      if (url.includes(API_PATTERN) && resp.status() === 200) {
        try {
          const data = await resp.json();
          if (data.ack === 'yes') {
            // 使用特定 720p 变体，避免主播放列表中的坏流污染
            const masterUrl: string = data.manifest?.hls_cdrm || '';
            hlsUrl = masterUrl ? masterUrl.replace(/\?b=\d+-\d+/, '?BR=td') : null;
            const masterBackup: string = data.backup?.hls_cdrm || '';
            backupUrl = masterBackup ? masterBackup.replace(/\?b=\d+-\d+/, '?BR=td') : null;
            channel = data.channel || 'cctv5';
            console.log(`  ✅ Got HLS URL (channel: ${channel}, drm: ${data.drm})`);
          }
        } catch { /* ignore parse errors */ }
      }
    });

    await page.goto(CCTV5_PAGE, {
      waitUntil: 'networkidle2',
      timeout: 30_000,
    });

    // 等待播放器初始化和 API 调用
    await sleep(5000);
  } finally {
    await browser.close();
  }

  if (!hlsUrl) {
    throw new Error('Failed to get CCTV5 HLS URL from API');
  }

  cachedUrl = {
    hlsUrl,
    backupUrl,
    channel,
    fetchedAt: Date.now(),
  };

  return cachedUrl;
}

/**
 * 清除缓存的 URL，强制下次重新获取。
 */
export function clearCCTV5UrlCache(): void {
  cachedUrl = null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
