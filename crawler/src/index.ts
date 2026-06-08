import 'dotenv/config';
import fs from 'node:fs';
import cron from 'node-cron';
import { fetchPexelsVideos } from './sources/pexels';
import { fetchRedditVideos } from './sources/reddit';
import { fetchNewsItems } from './sources/news';
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

  // Collect items from all sources
  const allItems: VideoItem[] = [];

  if (PEXELS_API_KEY) {
    console.log('\n📸 Fetching Pexels...');
    try {
      const pxItems = await fetchPexelsVideos(PEXELS_API_KEY, MAX_PER_SOURCE);
      console.log(`   Got ${pxItems.length} items`);
      allItems.push(...pxItems);
    } catch (err) {
      console.error('   Pexels error:', err);
    }
  } else {
    console.log('\n📸 Pexels: skipped (no PEXELS_API_KEY)');
  }

  console.log('\n📱 Fetching Reddit...');
  try {
    const redditItems = await fetchRedditVideos(MAX_PER_SOURCE);
    console.log(`   Got ${redditItems.length} items`);
    allItems.push(...redditItems);
  } catch (err) {
    console.error('   Reddit error:', err);
  }

  console.log('\n📰 Fetching News RSS...');
  try {
    const newsItems = await fetchNewsItems(MAX_PER_SOURCE);
    console.log(`   Got ${newsItems.length} items`);
    allItems.push(...newsItems);
  } catch (err) {
    console.error('   News RSS error:', err);
  }

  // Filter out already-seen
  const newItems = allItems.filter((item) => !isSeen(item.sourceUrl));
  console.log(`\n🔍 Total: ${allItems.length}, New: ${newItems.length}`);

  // Download and upload each new item
  let uploaded = 0;
  for (const item of newItems) {
    console.log(`\n---`);
    console.log(`📥 [${item.category}] ${item.title.slice(0, 80)}`);

    // Download thumbnail first (smaller, faster)
    let thumbPath: string | undefined;
    if (item.thumbnailUrl) {
      console.log('   Downloading thumbnail...');
      thumbPath = await downloadThumbnail(item.thumbnailUrl) ?? undefined;
    }

    // Download video
    console.log('   Downloading video...');
    const videoPath = await downloadVideo(item.videoUrl);
    if (!videoPath) {
      console.log('   ⚠️  Video download failed, skipping');
      markSeen(item.sourceUrl);
      continue;
    }
    console.log(`   Downloaded ${(fs.statSync(videoPath).size / 1024 / 1024).toFixed(1)} MB`);

    // Upload to Worker
    console.log('   Uploading to Worker...');
    const result = await uploadEvent(WORKER_URL, CRAWLER_TOKEN, item, videoPath, thumbPath);

    if (result.success) {
      console.log(`   ✅ Created event: ${result.eventId}`);
      markSeen(item.sourceUrl);
      uploaded++;
    } else {
      console.log(`   ❌ Upload failed: ${result.error}`);
    }

    // Clean up temp files
    cleanupTemp();

    // Rate limit: wait between uploads
    await sleep(5000);
  }

  console.log(`\n✨ Done! Uploaded ${uploaded}/${newItems.length} events`);
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
