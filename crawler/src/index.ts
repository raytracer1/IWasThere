import 'dotenv/config';
import fs from 'node:fs';
import cron from 'node-cron';
import { fetchPexelsVideos } from './sources/pexels';
import { fetchRedditVideos } from './sources/reddit';
import { fetchYoutubeTrending } from './sources/youtube';
import { downloadVideo, downloadThumbnail, cleanupTemp } from './downloader';
import { uploadEvent } from './uploader';
import { isSeen, markSeen, pruneState, loadState } from './state';
import type { VideoItem } from './types';

// ─── Config from env ────────────────────────────────────
const WORKER_URL = process.env.WORKER_URL ?? 'https://hotinsert-api.zhengbijun123.workers.dev';
const CRAWLER_TOKEN = process.env.CRAWLER_TOKEN ?? '';
const PEXELS_API_KEY = process.env.PEXELS_API_KEY ?? '';
const CRON_SCHEDULE = process.env.CRON_SCHEDULE ?? '0 */2 * * *';
const MAX_PER_SOURCE = parseInt(process.env.MAX_PER_SOURCE ?? '5', 10);

// ─── Source runner helper ─────────────────────────────────
interface SourceResult {
  name: string;
  items: VideoItem[];
  error?: string;
}

async function runSource(name: string, fn: () => Promise<VideoItem[]>): Promise<SourceResult> {
  console.log(`\n📡 ${name}...`);
  try {
    const items = await fn();
    console.log(`   ✅ ${items.length} items`);
    return { name, items };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`   ❌ ${name} error:`, msg);
    return { name, items: [], error: msg };
  }
}

// ─── Main crawl logic ────────────────────────────────────
async function crawl() {
  console.log(`\n🕷️  [${new Date().toISOString()}] Starting crawl...`);
  console.log(`   Worker: ${WORKER_URL}`);
  console.log(`   Max per source: ${MAX_PER_SOURCE}`);

  if (!CRAWLER_TOKEN) {
    console.error('❌ CRAWLER_TOKEN not set. Generate one with: npx tsx scripts/generate-token.ts');
    return;
  }

  pruneState();
  const state = loadState();
  console.log(`   Seen URLs: ${state.seenUrls.length}`);

  // ── Collect items from all sources in parallel ──────────
  const sourcePromises: Promise<SourceResult>[] = [
    // YouTube trending — richest source of hot videos
    runSource('YouTube Trending', () => fetchYoutubeTrending(MAX_PER_SOURCE)),
    // Reddit — native + external video links from popular subs
    runSource('Reddit Hot', () => fetchRedditVideos(MAX_PER_SOURCE)),
  ];

  // Pexels is optional (requires API key)
  if (PEXELS_API_KEY) {
    sourcePromises.push(
      runSource('Pexels Popular', () => fetchPexelsVideos(PEXELS_API_KEY, MAX_PER_SOURCE))
    );
  } else {
    console.log('\n📸 Pexels: skipped (no PEXELS_API_KEY)');
  }

  const sourceResults = await Promise.all(sourcePromises);

  // Merge and deduplicate all items
  const seenVideoUrls = new Set<string>();
  const allItems: VideoItem[] = [];
  for (const result of sourceResults) {
    for (const item of result.items) {
      const key = item.videoUrl;
      if (seenVideoUrls.has(key)) continue;
      seenVideoUrls.add(key);
      allItems.push(item);
    }
  }

  console.log(`\n📊 Total collected: ${allItems.length} (from ${sourceResults.length} sources)`);

  // Filter out already-uploaded (by source URL)
  const newItems = allItems.filter((item) => !isSeen(item.sourceUrl));
  console.log(`🆕 New items: ${newItems.length}`);

  // ── Download and upload each new item ──────────────────
  let uploaded = 0;
  for (const item of newItems) {
    console.log(`\n---`);
    console.log(`📥 [${item.category}] ${item.title.slice(0, 80)}`);
    console.log(`   Source: ${item.sourceUrl}`);

    // Download video
    console.log('   Downloading video...');
    const videoPath = await downloadVideo(item.videoUrl);
    if (!videoPath) {
      console.log('   ⚠️  Video download failed, skipping');
      markSeen(item.sourceUrl);
      continue;
    }
    console.log(`   Video: ${(fs.statSync(videoPath).size / 1024 / 1024).toFixed(1)} MB`);

    // Thumbnail: try URL first, fallback to frame extraction from video
    console.log('   Thumbnail...');
    const thumbPath = await downloadThumbnail(item.thumbnailUrl ?? undefined, videoPath);
    console.log(thumbPath ? '   ✅ Thumbnail ready' : '   ⚠️  No thumbnail available');

    // Upload to Worker
    console.log('   Uploading to Worker...');
    const result = await uploadEvent(WORKER_URL, CRAWLER_TOKEN, item, videoPath, thumbPath ?? undefined);

    if (result.success) {
      console.log(`   ✅ Created event: ${result.eventId}`);
      markSeen(item.sourceUrl);
      uploaded++;
    } else {
      console.log(`   ❌ Upload failed: ${result.error}`);
    }

    // Clean up temp files
    cleanupTemp();

    // Rate limit: wait between uploads to avoid overwhelming the Worker
    await sleep(5000);
  }

  console.log(`\n✨ Done! Uploaded ${uploaded}/${newItems.length} events`);

  // Show failure summary if all uploads failed
  if (uploaded === 0 && newItems.length > 0) {
    console.log('⚠️  All uploads failed. Check:');
    console.log('   1. WORKER_URL is correct and reachable');
    console.log('   2. CRAWLER_TOKEN is valid (regenerate if expired)');
    console.log('   3. Worker /admin/events endpoint accepts multipart uploads');
  }
}

// ─── Cron schedule ───────────────────────────────────────
if (cron.validate(CRON_SCHEDULE)) {
  console.log(`⏰ Crawler scheduled: ${CRON_SCHEDULE}`);
  console.log('   Press Ctrl+C to stop\n');

  // Run once immediately, then on schedule
  crawl().catch(console.error);

  cron.schedule(CRON_SCHEDULE, () => {
    crawl().catch(console.error);
  });
} else {
  console.error(`❌ Invalid cron schedule: ${CRON_SCHEDULE}`);
  process.exit(1);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
