import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { uploadEvent } from './src/uploader';
import { searchTikTok, downloadTikTok } from './src/sources/tiktok';

const WORKER_URL = process.env.WORKER_URL ?? '';
const CRAWLER_TOKEN = process.env.CRAWLER_TOKEN ?? '';
const TEMP_DIR = path.join(import.meta.dirname, 'data', 'tmp');

async function main() {
  console.log('🧪 Testing upload pipeline...\n');

  // 1. Search TikTok for a hot video
  console.log('📱 Searching TikTok: "world cup goal"...');
  const videos = await searchTikTok('world cup goal', 3);
  if (videos.length === 0) {
    console.log('❌ No TikTok videos found');
    return;
  }
  const v = videos[0];
  console.log(`   Got: "${v.title.slice(0, 60)}" (plays: ${v.playCount})`);

  // 2. Download the video
  console.log('\n📥 Downloading...');
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
  const mp4Path = path.join(TEMP_DIR, 'test-upload.mp4');
  const ok = await downloadTikTok(v.videoUrl, mp4Path);
  if (!ok) {
    console.log('❌ Download failed');
    return;
  }
  const sizeMB = (fs.statSync(mp4Path).size / 1024 / 1024).toFixed(1);
  console.log(`   Downloaded: ${sizeMB} MB`);

  // 3. Upload to Worker
  console.log('\n📤 Uploading to Worker...');
  const result = await uploadEvent(
    WORKER_URL,
    CRAWLER_TOKEN,
    {
      id: 'test-' + Date.now(),
      title: `[TEST] ${v.title.slice(0, 80)}`,
      category: 'sports',
      description: `Test upload: ${v.title.slice(0, 120)}`,
      videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl,
      duration: v.duration,
      sourceUrl: v.sourceUrl,
    },
    mp4Path,
    undefined,
  );

  if (result.success) {
    console.log(`   ✅ Uploaded! Event ID: ${result.eventId}`);
  } else {
    console.log(`   ❌ Upload failed: ${result.error}`);
  }

  // Cleanup
  try { fs.unlinkSync(mp4Path); } catch {}
  console.log('\n🧹 Cleaned up, test complete.');
}

main().catch(err => console.error('Fatal:', err));
