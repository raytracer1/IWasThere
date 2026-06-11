import type { VideoItem } from '../types';

// ─── Popular YouTube channels by category ──────────────────
// Channel RSS feeds: https://www.youtube.com/feeds/videos.xml?channel_id=UC...

interface Channel {
  id: string;
  name: string;
  category: VideoItem['category'];
}

// Only verified-working channel IDs (YouTube RSS is deprecated for some channels)
const POPULAR_CHANNELS: Channel[] = [
  // Sports
  { id: 'UCWJ2lWNubArHWmf3FIHbfcQ', name: 'NBA', category: 'sports' },
  { id: 'UCDVYQ4Zhbm3S2dlz7P1GBDg', name: 'NFL', category: 'sports' },
  { id: 'UCvgfXK4nTYKudb0rFR6noLA', name: 'UFC', category: 'sports' },

  // Music
  { id: 'UC5nc_ZtjKW1htCVZVRxlQAQ', name: 'MrSuicideSheep', category: 'music' },

  // Movies
  { id: 'UCi8e0iOVk1fEOogdfu4YgfA', name: 'MovieClips', category: 'movies' },

  // News
  { id: 'UC16niRr50-MSBwiO3YDb3RA', name: 'BBC News', category: 'news' },
  { id: 'UCupvZG-5ko_eiXAupbDfxWw', name: 'CNN', category: 'news' },
  { id: 'UCXIJgqnII2ZOINSWNOGFThA', name: 'Fox News', category: 'news' },
  { id: 'UCeY0bbntWzzVIaj2z3QigXg', name: 'NBC News', category: 'news' },

  // General / Viral
  { id: 'UCX6OQ3DkcsbYNE6H8uQQuVA', name: 'MrBeast', category: 'other' },
  { id: 'UCqFzWxSCi39LnW1JKFR3efg', name: 'SNL', category: 'other' },
  { id: 'UCBJycsmduvYEL83R_U4JriQ', name: 'MKBHD', category: 'other' },
  { id: 'UCXuqSBlHAE6Xw-yeJA0Tunw', name: 'Linus Tech Tips', category: 'other' },
];

// ─── YouTube RSS Parser ────────────────────────────────────

interface RssVideo {
  videoId: string;
  title: string;
  link: string;
  thumbnailUrl?: string;
  published: string;
}

/**
 * Parse a YouTube channel RSS feed to extract recent videos.
 * Channel RSS URL: https://www.youtube.com/feeds/videos.xml?channel_id=UC...
 */
async function fetchChannelRss(channelId: string): Promise<RssVideo[]> {
  const videos: RssVideo[] = [];
  try {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HotInsert-Crawler/1.0)',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return videos;

    const xml = await response.text();
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

    for (const entry of entries) {
      // Extract video ID from <yt:videoId>
      const vidMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      if (!vidMatch) continue;

      const videoId = vidMatch[1];

      // Extract title
      const titleMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
      const title = titleMatch
        ? decodeHtmlEntities(titleMatch[1].trim()).slice(0, 100)
        : 'Untitled';

      // Extract link
      const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/);
      const link = linkMatch
        ? linkMatch[1]
        : `https://www.youtube.com/watch?v=${videoId}`;

      // Extract thumbnail from <media:thumbnail>
      const thumbMatch = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/);
      const thumbnailUrl = thumbMatch ? thumbMatch[1] : undefined;

      // Extract published date
      const pubMatch = entry.match(/<published>([^<]+)<\/published>/);

      videos.push({
        videoId,
        title,
        link,
        thumbnailUrl,
        published: pubMatch ? pubMatch[1] : '',
      });
    }
  } catch (err) {
    console.warn(`YouTube RSS error (${channelId}):`, err);
  }
  return videos;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ─── Public API ────────────────────────────────────────────

/**
 * Fetch trending videos from popular YouTube channels via RSS feeds.
 * No API key required — RSS is publicly accessible.
 *
 * If YOUTUBE_API_KEY env var is set, also uses the YouTube Data API
 * for global trending (much larger pool).
 */
export async function fetchYoutubeTrending(maxResults: number): Promise<VideoItem[]> {
  const items: VideoItem[] = [];

  // Try Data API first if key is available (global trending)
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const apiItems = await fetchYoutubeDataApi(apiKey, maxResults);
      items.push(...apiItems);
      console.log(`   Data API: ${apiItems.length} items`);
    } catch (err) {
      console.warn('YouTube Data API error:', err);
    }
  }

  // Always supplement with channel RSS (broader coverage)
  // Shuffle channels for variety
  const channels = [...POPULAR_CHANNELS].sort(() => Math.random() - 0.5);

  for (const channel of channels) {
    if (items.length >= maxResults * 2) break;

    const videos = await fetchChannelRss(channel.id);
    for (const vid of videos) {
      if (items.length >= maxResults * 2) break;

      // Skip Shorts (IDs often start with certain patterns, or check title)
      if (vid.title.toLowerCase().includes('#shorts')) continue;

      items.push({
        id: `yt-${vid.videoId}`,
        title: vid.title,
        category: channel.category,
        description: `From ${channel.name}: ${vid.title.slice(0, 150)}`,
        videoUrl: `https://www.youtube.com/watch?v=${vid.videoId}`,
        thumbnailUrl: vid.thumbnailUrl,
        sourceUrl: `https://www.youtube.com/watch?v=${vid.videoId}`,
      });

      await sleep(200);
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  const deduped: VideoItem[] = [];
  for (const item of items) {
    const key = item.videoUrl;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.slice(0, maxResults);
}

// ─── YouTube Data API (optional, requires API key) ─────────

async function fetchYoutubeDataApi(apiKey: string, maxResults: number): Promise<VideoItem[]> {
  const items: VideoItem[] = [];
  const categories = [
    { videoCategoryId: '17', category: 'sports' as const },
    { videoCategoryId: '10', category: 'music' as const },
    { videoCategoryId: '1',  category: 'movies' as const },
    { videoCategoryId: '25', category: 'news' as const },
    { videoCategoryId: '0',  category: 'other' as const }, // all
  ];

  for (const { videoCategoryId, category } of categories) {
    if (items.length >= maxResults) break;

    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('chart', 'mostPopular');
    url.searchParams.set('regionCode', 'US');
    url.searchParams.set('maxResults', String(Math.ceil(maxResults / categories.length) + 2));
    if (videoCategoryId !== '0') {
      url.searchParams.set('videoCategoryId', videoCategoryId);
    }
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) continue;

    const data = (await response.json()) as {
      items?: Array<{
        id: string;
        snippet: { title: string; description: string; thumbnails?: { medium?: { url: string } } };
        contentDetails: { duration: string };
      }>;
    };

    for (const video of data.items ?? []) {
      if (items.length >= maxResults) break;

      // Parse ISO 8601 duration
      const duration = parseIsoDuration(video.contentDetails.duration);

      items.push({
        id: `ytapi-${video.id}`,
        title: video.snippet.title.slice(0, 100),
        category,
        description: video.snippet.description.slice(0, 200),
        videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
        thumbnailUrl: video.snippet.thumbnails?.medium?.url,
        duration,
        sourceUrl: `https://www.youtube.com/watch?v=${video.id}`,
      });
    }
  }

  return items;
}

function parseIsoDuration(duration: string): number | undefined {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;
  const h = parseInt(match[1] ?? '0');
  const m = parseInt(match[2] ?? '0');
  const s = parseInt(match[3] ?? '0');
  return h * 3600 + m * 60 + s;
}

// ─── Keyword Search (for event-driven mode) ───────────────

/**
 * Search YouTube by keyword, ordered by date (newest first).
 * Requires YOUTUBE_API_KEY env variable.
 */
export async function searchYoutubeByKeyword(keyword: string, maxResults = 5): Promise<VideoItem[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const items: VideoItem[] = [];

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', keyword);
    url.searchParams.set('type', 'video');
    url.searchParams.set('order', 'date');
    url.searchParams.set('maxResults', String(maxResults));
    url.searchParams.set('relevanceLanguage', 'en');
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) return items;

    const data = (await response.json()) as {
      items?: Array<{
        id: { videoId: string };
        snippet: { title: string; description: string; thumbnails?: { medium?: { url: string } }; publishedAt: string };
      }>;
    };

    for (const video of data.items ?? []) {
      if (items.length >= maxResults) break;

      const videoId = video.id?.videoId;
      if (!videoId) continue;

      // Skip shorts
      if (video.snippet.title.toLowerCase().includes('#shorts')) continue;

      items.push({
        id: `yt-${videoId}`,
        title: video.snippet.title.slice(0, 100),
        category: guessCategory(video.snippet.title),
        description: video.snippet.description.slice(0, 200),
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: video.snippet.thumbnails?.medium?.url,
        sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      });
    }
  } catch (err) {
    console.warn(`YouTube search error (${keyword}):`, err);
  }

  return items;
}

function guessCategory(title: string): VideoItem['category'] {
  const lower = title.toLowerCase();
  if (/sport|football|soccer|basketball|nba|nfl|ufc|boxing/i.test(lower)) return 'sports';
  if (/music|song|concert|performance/i.test(lower)) return 'music';
  if (/movie|film|trailer|teaser/i.test(lower)) return 'movies';
  if (/news|breaking|press|speech/i.test(lower)) return 'news';
  return 'other';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
