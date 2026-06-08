import type { VideoItem } from '../types';

const SEARCH_QUERIES = [
  { query: 'sports game', category: 'sports' as const },
  { query: 'concert live', category: 'music' as const },
  { query: 'movie scene', category: 'movies' as const },
  { query: 'news event', category: 'news' as const },
  { query: 'viral moment', category: 'other' as const },
];

interface PexelsVideo {
  id: number;
  url: string;
  image: string;
  duration: number;
  video_files: Array<{ link: string; width: number; height: number; quality: string }>;
}

/**
 * Fetch trending/popular videos from Pexels API.
 * Requires PEXELS_API_KEY env variable (free: 20k req/month).
 */
export async function fetchPexelsVideos(apiKey: string, maxResults: number): Promise<VideoItem[]> {
  const items: VideoItem[] = [];

  for (const { query, category } of SEARCH_QUERIES) {
    if (items.length >= maxResults) break;

    try {
      const url = new URL('https://api.pexels.com/videos/search');
      url.searchParams.set('query', query);
      url.searchParams.set('per_page', String(Math.ceil(maxResults / SEARCH_QUERIES.length)));
      url.searchParams.set('size', 'medium');
      url.searchParams.set('orientation', 'landscape');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': apiKey,
          'User-Agent': 'HotInsert-Crawler/1.0',
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        console.warn(`Pexels API error (${query}): ${response.status}`);
        continue;
      }

      const data = (await response.json()) as { videos: PexelsVideo[] };

      for (const video of data.videos ?? []) {
        // Pick best video file under 720p
        const files = video.video_files
          .filter((f) => f.height <= 720 && f.width >= 854)
          .sort((a, b) => b.height - a.height);

        if (files.length === 0) continue;

        items.push({
          id: `pexels-${video.id}`,
          title: `🔥 ${query}: ${video.id}`,
          category,
          description: `Pexels trending: ${query}`,
          videoUrl: files[0].link, // Direct download URL
          thumbnailUrl: video.image,
          duration: Math.round(video.duration),
          sourceUrl: video.url,
        });
      }

      await sleep(500);
    } catch (err) {
      console.warn(`Pexels source error (${query}):`, err);
    }
  }

  return items.slice(0, maxResults);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
