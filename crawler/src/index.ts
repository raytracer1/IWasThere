import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fetchTodayMatches, initScoreCache, detectEvents, isLiveStatus } from './sources/thesportsdb';
import { searchTikTok, downloadTikTok } from './sources/tiktok';
import { searchRedditByKeyword } from './sources/reddit';
import { searchYoutubeByKeyword } from './sources/youtube';
import { downloadVideo, downloadThumbnail, cleanupTemp, processVideoFile } from './downloader';
import { uploadEvent } from './uploader';
import { isSeen, markSeen, pruneState } from './state';
import { calculateEventHotness, filterAndScore, deduplicateByVideo } from './scorer';
import { startRecording, stopRecording, extractClipByUtc, reloadRecorder, isRecorderRunning } from './recorder';
import { findLiveFixture, getGoalEvents, getCachedFixtureId, setCachedFixtureId, estimateGoalUtcMs } from './sources/api-football';
import type { VideoItem, VideoCandidate, ScoredVideo, EventTrigger } from './types';

// ─── Config from env ────────────────────────────────────
const WORKER_URL = process.env.WORKER_URL ?? 'https://hotinsert-api.zhengbijun123.workers.dev';
const CRAWLER_TOKEN = process.env.CRAWLER_TOKEN ?? '';
const CRAWL_MODE = process.env.CRAWL_MODE ?? 'event-driven'; // event-driven | passive
const MAX_VIDEOS_PER_EVENT = parseInt(process.env.MAX_VIDEOS_PER_EVENT ?? '5', 10);
const MIN_HOTNESS = parseInt(process.env.MIN_HOTNESS_SCORE ?? '40', 10);
const POLL_INTERVAL_SEC = parseInt(process.env.POLL_INTERVAL_SEC ?? '60', 10);
const ENABLE_TIKTOK = process.env.ENABLE_TIKTOK !== 'false';
const ENABLE_REDDIT = process.env.ENABLE_REDDIT !== 'false';
const ENABLE_YOUTUBE = process.env.ENABLE_YOUTUBE !== 'false';
const ENABLE_CCTV5 = process.env.ENABLE_CCTV5 === 'true';  // 从 CCTV5 直播截取进球片段

// Temp dir for TikTok downloads
const TEMP_DIR = path.join(import.meta.dirname, '..', 'data', 'tmp');

// ─── Event-driven main loop ─────────────────────────────

async function eventDrivenLoop() {
  console.log('🎯 Event-driven crawler started');
  console.log(`   Poll interval: ${POLL_INTERVAL_SEC}s`);
  console.log(`   Max videos/event: ${MAX_VIDEOS_PER_EVENT}`);
  console.log(`   Min hotness: ${MIN_HOTNESS}`);
  console.log(`   TikTok: ${ENABLE_TIKTOK ? '✅' : '❌'}  Reddit: ${ENABLE_REDDIT ? '✅' : '❌'}  YouTube: ${ENABLE_YOUTUBE ? '✅' : '❌'}  CCTV5: ${ENABLE_CCTV5 ? '✅' : '❌'}`);

  if (!CRAWLER_TOKEN) {
    console.error('❌ CRAWLER_TOKEN not set');
    return;
  }

  // Start CCTV5 recorder if enabled
  if (ENABLE_CCTV5) {
    try {
      await startRecording();
      console.log('   📡 CCTV5 recorder started');
    } catch (err) {
      console.error('   ❌ Failed to start CCTV5 recorder:', String(err).slice(0, 100));
    }
  }

  // Initialize: load existing state and cache current scores
  pruneState();
  const initialMatches = await fetchTodayMatches();
  initScoreCache(initialMatches);
  const liveNow = initialMatches.filter(m => isLiveStatus(m.status));
  console.log(`\n📊 Today: ${initialMatches.length} matches in target leagues, ${liveNow.length} live now`);
  for (const m of liveNow) {
    console.log(`   🔴 ${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam} (${m.league})`);
  }

  // Poll loop
  while (true) {
    try {
      const matches = await fetchTodayMatches();
      const liveMatches = matches.filter(m => isLiveStatus(m.status));

      const now = new Date().toISOString();
      if (liveMatches.length > 0) {
        const events = detectEvents(liveMatches);
        const significant = events.filter(e => e.hotness >= MIN_HOTNESS);

        console.log(`⏱️  [${now}] ${liveMatches.length} live, ${significant.length} triggered`);

        if (significant.length > 0) {
          for (const event of significant) {
            await handleEvent(event);
          }
        } else if (events.length > 0) {
          for (const e of events) {
            console.log(`⏭️  ${e.match.homeTeam} vs ${e.match.awayTeam} (hotness ${e.hotness} < ${MIN_HOTNESS})`);
          }
        }
      } else if (matches.length > 0) {
        const upcoming = matches.filter(m => m.status === 'NS');
        console.log(`⏱️  [${now}] No live matches. ${matches.length} today, ${upcoming.length} upcoming`);
      } else {
        console.log(`⏱️  [${now}] No matches found today`);
      }
    } catch (err) {
      console.error('Poll error:', err);
    }

    await sleep(POLL_INTERVAL_SEC * 1000);
  }
}

// ─── Handle a single event trigger ──────────────────────

async function handleEvent(event: EventTrigger) {
  const { match, currentScore, hotness, keywords } = event;
  console.log(`\n─── Event: ${match.homeTeam} vs ${match.awayTeam} (${currentScore}) ───`);
  console.log(`   League: ${match.league} | Hotness: ${hotness}`);
  console.log(`   Keywords: ${keywords.slice(0, 3).join(', ')}`);

  // Phase 1: Search all enabled platforms in parallel
  const searchResults: { platform: VideoCandidate['platform']; videos: VideoItem[] }[] = [];

  const searchers: Promise<void>[] = [];

  if (ENABLE_TIKTOK) {
    searchers.push(
      searchAllKeywords(keywords, 10, async (kw) => {
        const candidates = await searchTikTok(kw, 10);
        return candidates.map(c => ({
          id: c.id, title: c.title, category: 'sports' as const,
          description: `TikTok: ${c.title.slice(0, 150)}`,
          videoUrl: c.videoUrl, thumbnailUrl: c.thumbnailUrl,
          duration: c.duration, sourceUrl: c.sourceUrl,
        } satisfies VideoItem));
      }).then(videos => {
        if (videos.length > 0) searchResults.push({ platform: 'tiktok', videos });
        console.log(`   TikTok: ${videos.length} videos`);
      })
    );
  }

  if (ENABLE_REDDIT) {
    searchers.push(
      searchAllKeywords(keywords, 5, kw => searchRedditByKeyword(kw, 5))
        .then(videos => {
          if (videos.length > 0) searchResults.push({ platform: 'reddit', videos });
          console.log(`   Reddit: ${videos.length} videos`);
        })
    );
  }

  if (ENABLE_YOUTUBE) {
    searchers.push(
      searchAllKeywords(keywords, 5, kw => searchYoutubeByKeyword(kw, 5))
        .then(videos => {
          if (videos.length > 0) searchResults.push({ platform: 'youtube', videos });
          console.log(`   YouTube: ${videos.length} videos`);
        })
    );
  }

  await Promise.all(searchers);

  // Phase 1.5: CCTV5 live capture (runs in parallel with social search)
  if (ENABLE_CCTV5 && isRecorderRunning()) {
    await captureFromCCTV5(event);
  }

  // Phase 2: Filter, score, dedup
  let allScored: ScoredVideo[] = [];
  for (const { platform, videos } of searchResults) {
    const scored = filterAndScore(videos, platform, keywords, undefined, undefined, MAX_VIDEOS_PER_EVENT * 2);
    allScored.push(...scored);
  }
  allScored = deduplicateByVideo(allScored);
  allScored.sort((a, b) => b.score - a.score);
  const topVideos = allScored.slice(0, MAX_VIDEOS_PER_EVENT);

  console.log(`\n   📋 Scored: ${allScored.length}, after dedup: ${allScored.length}, top ${topVideos.length}:`);
  for (const v of topVideos) {
    console.log(`      ${v.score}pts [${v.platform}] ${v.title.slice(0, 60)}`);
  }

  // Phase 3: Download and upload
  let uploaded = 0;
  for (const video of topVideos) {
    if (isSeen(video.sourceUrl)) {
      console.log(`   ⏭️  Already seen: ${video.title.slice(0, 50)}`);
      continue;
    }

    console.log(`\n   📥 [${video.score}pts] ${video.title.slice(0, 70)}`);

    const videoPath = await downloadOne(video);
    if (!videoPath) {
      markSeen(video.sourceUrl);
      continue;
    }

    const thumbPath = await downloadThumbnail(video.thumbnailUrl ?? undefined, videoPath);

    console.log('   Uploading...');
    const result = await uploadEvent(WORKER_URL, CRAWLER_TOKEN, {
      id: video.id,
      title: video.title,
      category: video.category,
      description: video.description,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      sourceUrl: video.sourceUrl,
    }, videoPath, thumbPath ?? undefined);

    if (result.success) {
      console.log(`   ✅ Event: ${result.eventId}`);
      markSeen(video.sourceUrl);
      uploaded++;
    } else {
      console.log(`   ❌ Upload failed: ${result.error}`);
    }

    cleanupTemp();
    await sleep(3000); // rate limit between uploads
  }

  console.log(`\n   ✨ Event complete: ${uploaded}/${topVideos.length} uploaded`);
}

// ─── CCTV5 live capture ─────────────────────────────

// 每个比赛有多少个已知进球（用于只取新进球）
const knownGoalCount = new Map<string, number>(); // key: "home-away-date"

async function captureFromCCTV5(event: EventTrigger) {
  const { match, currentScore } = event;
  console.log(`   🎥 CCTV5: ${match.homeTeam} vs ${match.awayTeam} (${currentScore})`);

  try {
    const today = match.date;
    const matchKey = `${match.homeTeam}-${match.awayTeam}-${today}`;

    // ── Step 1: 找到 API-Football 的 fixture ID ──
    let fixtureId = getCachedFixtureId(match.homeTeam, match.awayTeam, today);
    if (!fixtureId) {
      console.log('   🔍 Looking up fixture in API-Football...');
      const info = await findLiveFixture(match.homeTeam, match.awayTeam, today);
      if (!info) {
        console.log('   ⚠️  Fixture not found in API-Football, falling back to buffer estimate');
        await fallbackCapture(match, currentScore);
        return;
      }
      fixtureId = info.id;
      setCachedFixtureId(match.homeTeam, match.awayTeam, today, info.id);
      console.log(`   ✅ Fixture found: ${info.id} | Kickoff: ${info.kickoffUtc} | Status: ${info.status} (${info.elapsed}')`);
      // 同时缓存开球时间
      matchKickoffCache.set(matchKey, info.kickoffUtc);
    }

    // ── Step 2: 获取最新进球 ──
    const prevCount = knownGoalCount.get(matchKey) ?? 0;
    const newGoals = await getGoalEvents(fixtureId, prevCount);
    if (newGoals.length === 0) {
      console.log(`   ⚠️  No new goal events from API-Football (had ${prevCount}), falling back to buffer`);
      await fallbackCapture(match, currentScore);
      return;
    }

    // ── Step 3: 对每个新进球，计算 UTC 时间并截取 ──
    const kickoffUtc = matchKickoffCache.get(matchKey);
    if (!kickoffUtc) {
      console.log('   ⚠️  No kickoff time cached, falling back');
      await fallbackCapture(match, currentScore);
      return;
    }

    for (const goal of newGoals) {
      console.log(`\n   ⚽ Goal! ${goal.playerName} (${goal.teamName}) at ${goal.elapsed}'${goal.extra ? `+${goal.extra}` : ''} | ${goal.detail}`);

      const goalUtcMs = estimateGoalUtcMs(kickoffUtc, goal.elapsed + (goal.extra ?? 0));
      console.log(`   🕐 Estimated UTC: ${new Date(goalUtcMs).toISOString()}`);

      // 截取进球前后：前 60s + 后 120s = 3 分钟
      const clipPath = await extractClipByUtc(goalUtcMs, 60, 120);
      if (!clipPath) {
        console.log('   ⚠️  Failed to extract clip from buffer');
        continue;
      }

      const sizeMB = (fs.statSync(clipPath).size / 1024 / 1024).toFixed(1);
      console.log(`   📹 Clip: ${sizeMB} MB`);

      const thumbPath = await downloadThumbnail(undefined, clipPath);
      const title = `${goal.playerName} GOAL! ${match.homeTeam} ${currentScore} ${match.awayTeam} - ${match.league}`;
      const desc = `CCTV5: ${goal.playerName} scores for ${goal.teamName} at ${goal.elapsed}' (${goal.detail}) | ${match.homeTeam} vs ${match.awayTeam} | ${match.league}`;

      console.log('   📤 Uploading...');
      const result = await uploadEvent(WORKER_URL, CRAWLER_TOKEN, {
        id: `cctv5-${match.id}-goal-${goal.elapsed}`,
        title,
        category: 'sports',
        description: desc,
        videoUrl: '',
        thumbnailUrl: '',
        duration: 180,
        sourceUrl: `https://tv.cctv.com/live/cctv5/`,
      }, clipPath, thumbPath ?? undefined);

      if (result.success) {
        console.log(`   ✅ Event: ${result.eventId}`);
      } else {
        console.log(`   ❌ Upload failed: ${result.error}`);
      }

      try { fs.unlinkSync(clipPath); } catch {}
      if (thumbPath) { try { fs.unlinkSync(thumbPath); } catch {} }
    }

    // 更新已知进球数
    knownGoalCount.set(matchKey, prevCount + newGoals.length);
  } catch (err) {
    console.error('   ❌ CCTV5 capture error:', String(err).slice(0, 150));
  }
}

/** 缓存 matchKey → kickoff ISO string */
const matchKickoffCache = new Map<string, string>();

/**
 * 降级方案：没有 API-Football 数据时，从缓冲区盲取 3 分钟片段。
 */
async function fallbackCapture(match: any, currentScore: string) {
  console.log('   🎲 Using buffer estimate (60-120s ago)...');
  const clipPath = await extractClipByUtc(Date.now() - 90 * 1000, 60, 120);
  if (!clipPath) return;

  const thumbPath = await downloadThumbnail(undefined, clipPath);
  const title = `${match.homeTeam} vs ${match.awayTeam} ${currentScore} - ${match.league}`;

  const result = await uploadEvent(WORKER_URL, CRAWLER_TOKEN, {
    id: `cctv5-fallback-${match.id}-${currentScore.replace(':', '-')}`,
    title,
    category: 'sports',
    description: `CCTV5: ${match.homeTeam} ${currentScore} ${match.awayTeam}`,
    videoUrl: '', thumbnailUrl: '', duration: 180,
    sourceUrl: 'https://tv.cctv.com/live/cctv5/',
  }, clipPath, thumbPath ?? undefined);

  if (result.success) console.log(`   ✅ Fallback event: ${result.eventId}`);
  try { fs.unlinkSync(clipPath); } catch {}
  if (thumbPath) { try { fs.unlinkSync(thumbPath); } catch {} }
}

// ─── Helper: search across multiple keywords ─────────────

async function searchAllKeywords(
  keywords: string[],
  maxPerKeyword: number,
  searcher: (kw: string) => Promise<VideoItem[]>
): Promise<VideoItem[]> {
  const all: VideoItem[] = [];
  const seen = new Set<string>();

  // Search first 5 keywords
  for (const kw of keywords.slice(0, 5)) {
    if (all.length >= maxPerKeyword * 2) break;
    try {
      const results = await searcher(kw);
      for (const item of results) {
        const key = item.videoUrl;
        if (seen.has(key)) continue;
        seen.add(key);
        all.push(item);
      }
    } catch {}
  }

  return all;
}

// ─── Helper: download a single video ────────────────────

async function downloadOne(video: VideoItem | ScoredVideo): Promise<string | null> {
  const vidUrl = video.videoUrl;

  // TikTok: direct HTTP download
  if (vidUrl.includes('tiktokcdn') || ('platform' in video && video.platform === 'tiktok')) {
    console.log('   TikTok direct download...');
    const outPath = path.join(TEMP_DIR, `${randomUUID()}.mp4`);
    const ok = await downloadTikTok(vidUrl, outPath);
    if (ok && fs.existsSync(outPath)) {
      // Run quality check + re-encode pipeline (scale to 720p, cap at 24fps)
      const processed = await processVideoFile(outPath, true);
      if (processed) {
        console.log(`   Video: ${(fs.statSync(processed).size / 1024 / 1024).toFixed(1)} MB`);
        return processed;
      }
      return null;
    }
    console.log('   ❌ TikTok download failed, trying yt-dlp fallback...');
  }

  // Everything else: use standard downloader
  return downloadVideo(vidUrl);
}

// ─── Passive mode (original behavior) ───────────────────

async function passiveCrawl() {
  console.log('📡 Passive crawl mode (original behavior)');
  // This mode is kept as fallback — imports the original sources
  // For now, just print a message
  console.log('   Passive mode uses the original fetch functions.');
  console.log('   Use event-driven mode for real-time event tracking.');
}

// ─── Entry point ─────────────────────────────────────────

async function main() {
  console.log(`\n🕷️  IWasThere Crawler [${new Date().toISOString()}]`);
  console.log(`   Mode: ${CRAWL_MODE}`);
  console.log(`   Worker: ${WORKER_URL}\n`);

  if (CRAWL_MODE === 'passive') {
    await passiveCrawl();
  } else {
    await eventDrivenLoop();
  }
}

// Graceful shutdown: stop CCTV5 recorder
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  stopRecording();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopRecording();
  process.exit(0);
});

main().catch(console.error);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
