import type { VideoCandidate } from '../types';

const TIKWM_API = 'https://www.tikwm.com/api';

interface TikWmVideo {
  video_id: string;
  title: string;
  play: string;          // direct download URL (no watermark)
  cover: string;         // thumbnail URL
  duration: number;
  play_count: number;
  create_time: number;   // unix timestamp
}

interface TikWmResponse {
  code: number;
  msg: string;
  data: {
    videos: TikWmVideo[];
  };
}

/**
 * Search TikTok videos by keyword via tikwm.com API.
 * Free, no auth required.
 */
export async function searchTikTok(keyword: string, count = 10): Promise<VideoCandidate[]> {
  const candidates: VideoCandidate[] = [];

  try {
    const url = `${TIKWM_API}/feed/search?keywords=${encodeURIComponent(keyword)}&count=${count}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HotInsert-Crawler/1.0)' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return candidates;

    const data = (await response.json()) as TikWmResponse;
    if (data.code !== 0 || !data.data?.videos) return candidates;

    for (const v of data.data.videos) {
      if (!v.play || !v.video_id) continue;

      // Skip very short or very long videos
      if (v.duration < 5 || v.duration > 600) continue;

      candidates.push({
        id: `tt-${v.video_id}`,
        title: v.title?.slice(0, 100) ?? 'Untitled',
        category: 'other',
        videoUrl: v.play,               // Direct download URL
        thumbnailUrl: v.cover,
        duration: v.duration,
        sourceUrl: `https://www.tiktok.com/@/video/${v.video_id}`,
        platform: 'tiktok',
        playCount: v.play_count,
        publishedAt: new Date(v.create_time * 1000).toISOString(),
      });
    }
  } catch (err) {
    console.warn(`TikTok search error (${keyword}):`, err);
  }

  return candidates;
}

/**
 * Download a TikTok video by its direct play URL.
 * Simple HTTP download — no yt-dlp needed.
 */
export async function downloadTikTok(playUrl: string, outputPath: string): Promise<boolean> {
  try {
    const response = await fetch(playUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.tiktok.com/',
      },
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok || !response.body) return false;

    const contentLength = parseInt(response.headers.get('content-length') ?? '0');
    if (contentLength > 100 * 1024 * 1024) return false; // > 100MB

    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 100 * 1024 * 1024) return false;
      chunks.push(value);
    }

    const fs = await import('node:fs');
    fs.writeFileSync(outputPath, Buffer.concat(chunks));
    return true;
  } catch (err) {
    console.warn('TikTok download error:', err);
    return false;
  }
}
