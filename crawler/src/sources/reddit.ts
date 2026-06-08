import type { VideoItem } from '../types';

interface RedditPost {
  data: {
    id: string;
    title: string;
    subreddit: string;
    url: string;
    thumbnail: string;
    is_video: boolean;
    media?: { reddit_video?: { fallback_url: string; duration: number } };
    preview?: { images?: { source?: { url: string } }[] };
    created_utc: number;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
    after?: string | null;
  };
}

const SUBREDDIT_MAP: Record<string, VideoItem['category']> = {
  sports: 'sports',
  soccer: 'sports',
  nba: 'sports',
  music: 'music',
  concerts: 'music',
  movies: 'movies',
  trailers: 'movies',
  news: 'news',
  worldnews: 'news',
  funny: 'other',
  interestingasfuck: 'other',
  Damnthatsinteresting: 'other',
  nextfuckinglevel: 'other',
};

/**
 * Fetch trending video posts from Reddit's JSON API (free, no auth required).
 */
export async function fetchRedditVideos(maxResults: number): Promise<VideoItem[]> {
  const items: VideoItem[] = [];
  const subreddits = Object.keys(SUBREDDIT_MAP);

  for (const sub of subreddits) {
    if (items.length >= maxResults) break;

    try {
      const url = `https://www.reddit.com/r/${sub}/hot.json?limit=25`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'HotInsert-Crawler/1.0' },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) continue;

      const { data } = (await response.json()) as RedditResponse;

      for (const post of data.children) {
        if (items.length >= maxResults) break;

        const p = post.data;

        // Only include video posts
        if (!p.is_video || !p.media?.reddit_video) continue;
        // Skip NSFW
        if (p.thumbnail === 'nsfw') continue;
        // Skip very long videos (> 5 min)
        if (p.media.reddit_video.duration > 300) continue;

        const videoUrl = p.media.reddit_video.fallback_url;
        const thumbnailUrl = p.preview?.images?.[0]?.source?.url
          ?.replace(/&amp;/g, '&') ?? undefined;

        items.push({
          id: `reddit-${p.id}`,
          title: p.title.slice(0, 100),
          category: SUBREDDIT_MAP[sub] ?? 'other',
          description: `r/${p.subreddit}: ${p.title.slice(0, 150)}`,
          videoUrl,
          thumbnailUrl,
          duration: Math.round(p.media.reddit_video.duration),
          sourceUrl: `https://reddit.com/r/${sub}/comments/${p.id}`,
        });
      }

      await sleep(500);
    } catch (err) {
      console.warn(`Reddit source error (r/${sub}):`, err);
    }
  }

  return items.slice(0, maxResults);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
