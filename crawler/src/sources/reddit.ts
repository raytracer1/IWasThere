import type { VideoItem } from '../types';

/**
 * Reddit RSS-based video fetcher.
 *
 * Reddit's JSON API now requires OAuth, but RSS feeds (.rss) are still publicly
 * accessible. Each RSS entry contains:
 *   [link]      → the external URL the user submitted (YouTube, Streamable, etc.)
 *   [comments]  → link to Reddit comment thread
 *
 * This source parses the Atom XML to extract video links from trending subreddits.
 */

const SUBREDDIT_MAP: Record<string, VideoItem['category']> = {
  // Sports
  sports: 'sports', soccer: 'sports', nba: 'sports', nfl: 'sports',
  formula1: 'sports', mma: 'sports', boxing: 'sports', hockey: 'sports',
  // Music
  music: 'music', concerts: 'music', listentothis: 'music', hiphopheads: 'music',
  electronicmusic: 'music', popheads: 'music',
  // Movies
  movies: 'movies', trailers: 'movies', television: 'movies',
  // News
  news: 'news', worldnews: 'news', politics: 'news', technology: 'news',
  // General video-heavy subs (high yield)
  funny: 'other', interestingasfuck: 'other', Damnthatsinteresting: 'other',
  nextfuckinglevel: 'other', BeAmazed: 'other', oddlysatisfying: 'other',
  Unexpected: 'other', publicfreakout: 'other', Whatcouldgowrong: 'other',
  instant_regret: 'other', natureismetal: 'other', AbruptChaos: 'other',
  // Video-focused subs
  videos: 'other', youtubehaiku: 'other', DeepIntoYouTube: 'other',
  mealtimevideos: 'other', Documentaries: 'other',
  // Highlight subs (sports clips)
  highlightgifs: 'other', sportsarefun: 'other',
};

// Domains that yt-dlp can download from
const VIDEO_DOMAINS = [
  'youtube.com', 'youtu.be', 'm.youtube.com',
  'v.redd.it',
  'streamable.com', 'streamja.com',
  'twitch.tv', 'clips.twitch.tv',
  'vimeo.com', 'dailymotion.com',
  'tiktok.com', 'vm.tiktok.com',
  'twitter.com', 'x.com',
  'bilibili.com',
  'gfycat.com', 'imgur.com',
  'instagram.com',
  'facebook.com', 'fb.watch',
  'rumble.com', 'odysee.com',
];

function isVideoDomain(domain: string): boolean {
  const lower = domain.toLowerCase();
  return VIDEO_DOMAINS.some((d) => lower.includes(d));
}

/** Quick domain extraction from a URL */
function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

interface RssEntry {
  title: string;
  commentsLink: string;    // Reddit permalink
  externalLink?: string;   // The actual video URL
  thumbnailUrl?: string;
}

/**
 * Parse a single Atom <entry> element from Reddit's RSS feed.
 */
function parseEntry(entryXml: string): RssEntry | null {
  // Extract <title>
  const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  if (!titleMatch) return null;
  const title = decodeHtmlEntities(titleMatch[1].trim());

  // Extract all <link> elements
  const linkMatches = entryXml.match(/<link[^>]*?href="([^"]*)"[^>]*>/g) ?? [];
  const links: string[] = [];
  for (const lm of linkMatches) {
    const hrefMatch = lm.match(/href="([^"]*)"/);
    if (hrefMatch) links.push(hrefMatch[1]);
  }

  // Extract content HTML
  const contentMatch = entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/);
  const contentHtml = contentMatch
    ? decodeHtmlEntities(contentMatch[1])
    : '';

  // Find external link: the <a> tag with text "[link]"
  let externalLink: string | undefined;
  const linkTagMatch = contentHtml.match(/<a\s+[^>]*href="([^"]+)"[^>]*>\s*\[link\]\s*<\/a>/i);
  if (linkTagMatch) {
    externalLink = linkTagMatch[1];
  }

  // Find comments link
  let commentsLink = '';
  const commentTagMatch = contentHtml.match(/<a\s+[^>]*href="([^"]+)"[^>]*>\s*\[comments\]\s*<\/a>/i);
  if (commentTagMatch) {
    commentsLink = commentTagMatch[1];
  }
  // Fallback: use the alternate link from the <link> elements
  if (!commentsLink) {
    commentsLink = links.find((l) => l.includes('/comments/')) ?? links[0] ?? '';
  }

  // Thumbnail: first <img> in content
  let thumbnailUrl: string | undefined;
  const imgMatch = contentHtml.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
  if (imgMatch) {
    thumbnailUrl = imgMatch[1];
  }

  return { title, commentsLink, externalLink, thumbnailUrl };
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/** Clean up a URL: decode HTML entities and fix redundant encoding */
function cleanUrl(url: string): string {
  // Decode any remaining HTML entities in the URL itself
  let cleaned = decodeHtmlEntities(url);
  // Remove tracking parameters that might break yt-dlp
  try {
    const u = new URL(cleaned);
    // Remove common tracking params
    u.searchParams.delete('si');       // YouTube sharing ID
    u.searchParams.delete('pp');       // YouTube playback param
    u.searchParams.delete('feature');  // YouTube feature tag
    cleaned = u.toString();
  } catch {}
  return cleaned;
}

/** Check if a URL is a YouTube Shorts (vertical video) */
function isYoutubeShort(url: string): boolean {
  return /youtube\.com\/shorts\//i.test(url) || /youtu\.be\/shorts\//i.test(url);
}

/** Guess category from title text */
function guessCategory(title: string, subreddit: string): VideoItem['category'] {
  const lower = (title + ' ' + subreddit).toLowerCase();
  if (/sport|football|soccer|basketball|nba|nfl|ufc|boxing|match|race|f1|goal|touchdown|hockey|baseball|tennis/i.test(lower)) return 'sports';
  if (/music|song|concert|band|guitar|piano|sing|rap|album|ft\.|feat\.|dj\b|mix\b|live performance/i.test(lower)) return 'music';
  if (/trailer|movie|film|teaser|cinema|actor|actress|netflix|hbo|series|episode/i.test(lower)) return 'movies';
  if (/news|breaking|trump|biden|president|election|vote|congress|war|protest|speech|press|senate|supreme court/i.test(lower)) return 'news';
  return 'other';
}

/**
 * Fetch trending video posts from Reddit via RSS feeds.
 * No authentication required — RSS is publicly accessible.
 */
export async function fetchRedditVideos(maxResults: number): Promise<VideoItem[]> {
  const items: VideoItem[] = [];
  const subreddits = Object.keys(SUBREDDIT_MAP);

  // Shuffle for variety across runs
  const shuffled = subreddits.sort(() => Math.random() - 0.5);

  for (const sub of shuffled) {
    if (items.length >= maxResults * 2) break; // collect extra for dedup

    try {
      const url = `https://www.reddit.com/r/${sub}/.rss?limit=25`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HotInsert-Crawler/1.0)',
          'Accept': 'application/atom+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) continue;

      const xml = await response.text();

      // Parse each <entry> element
      const entryMatches = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

      for (const entryXml of entryMatches) {
        if (items.length >= maxResults * 2) break;

        const entry = parseEntry(entryXml);
        if (!entry) continue;

        // Skip if no external video link
        if (!entry.externalLink) continue;

        // Clean the URL (fix HTML entities, strip tracking params)
        const cleanedUrl = cleanUrl(entry.externalLink);

        // Skip YouTube Shorts (vertical videos won't work for face swap)
        if (isYoutubeShort(cleanedUrl)) continue;

        // Check if the external link is a video host
        const domain = getDomain(cleanedUrl);
        if (!isVideoDomain(domain)) continue;

        // Skip NSFW (Reddit RSS includes nsfw tag in title for adult content)
        if (entry.title.toLowerCase().includes('[nsfw]')) continue;

        // Skip self/text posts
        if (domain === 'reddit.com' || domain === 'self.reddit.com') continue;

        const category = SUBREDDIT_MAP[sub] ?? guessCategory(entry.title, sub);

        items.push({
          id: `reddit-${Buffer.from(entry.commentsLink).toString('base64').slice(0, 20)}`,
          title: entry.title.slice(0, 100),
          category,
          description: `r/${sub}: ${entry.title.slice(0, 150)}`,
          videoUrl: cleanedUrl,
          thumbnailUrl: entry.thumbnailUrl,
          sourceUrl: entry.commentsLink,
        });
      }

      // Respect rate limits
      await sleep(1000);
    } catch (err) {
      console.warn(`Reddit RSS error (r/${sub}):`, err);
    }
  }

  // Deduplicate by video URL
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

/** Sports-related subreddits for keyword search */
const SPORTS_SUBREDDITS = [
  'soccer', 'sports', 'nba', 'nfl', 'worldcup', 'mma', 'ufc',
  'formula1', 'hockey', 'baseball', 'tennis', 'cricket',
  'boxing', 'mls', 'nhl',
];

/**
 * Search Reddit for videos matching a keyword across sports subreddits.
 * Uses search.rss with sort=new for fastest event-related results.
 */
export async function searchRedditByKeyword(keyword: string, maxResults = 5): Promise<VideoItem[]> {
  const items: VideoItem[] = [];
  const subs = [...SPORTS_SUBREDDITS].sort(() => Math.random() - 0.5);

  for (const sub of subs) {
    if (items.length >= maxResults) break;

    try {
      const url = `https://www.reddit.com/r/${sub}/search.rss?q=${encodeURIComponent(keyword)}&sort=new&restrict_sr=on&limit=10`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HotInsert-Crawler/1.0)',
          'Accept': 'application/atom+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) continue;

      const xml = await response.text();
      const entryMatches = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

      for (const entryXml of entryMatches) {
        if (items.length >= maxResults) break;

        const entry = parseEntry(entryXml);
        if (!entry?.externalLink) continue;

        const cleanedUrl = cleanUrl(entry.externalLink);
        if (isYoutubeShort(cleanedUrl)) continue;

        const domain = getDomain(cleanedUrl);
        if (!isVideoDomain(domain)) continue;
        if (domain === 'reddit.com' || domain === 'self.reddit.com') continue;

        const category = guessCategory(entry.title, sub);

        items.push({
          id: `reddit-${Buffer.from(entry.commentsLink).toString('base64').slice(0, 20)}`,
          title: entry.title.slice(0, 100),
          category,
          description: `r/${sub}: ${entry.title.slice(0, 150)}`,
          videoUrl: cleanedUrl,
          thumbnailUrl: entry.thumbnailUrl,
          sourceUrl: entry.commentsLink,
        });
      }

      await sleep(300); // short delay between subreddits
    } catch (err) {
      // Silently skip failed subreddits in keyword search mode
    }
  }

  return items;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
