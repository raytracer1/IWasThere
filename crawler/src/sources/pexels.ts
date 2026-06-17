import type { VideoItem } from '../types';

interface PexelsVideo {
  id: number;
  url: string;
  image: string;
  duration: number;
  user: { name: string };
  video_files: Array<{ link: string; width: number; height: number; quality: string }>;
}

/**
 * Fetch trending/popular videos from Pexels API.
 * Uses the /videos/popular endpoint which returns truly trending content.
 * Requires PEXELS_API_KEY env variable (free: 20k req/month).
 */
export async function fetchPexelsVideos(apiKey: string, maxResults: number): Promise<VideoItem[]> {
  const items: VideoItem[] = [];

  try {
    // Use the popular/trending endpoint — much better than search queries
    const url = new URL('https://api.pexels.com/videos/popular');
    url.searchParams.set('per_page', String(Math.min(maxResults * 3, 80)));
    // Pexels free tier: min_width/min_height/min_duration filters
    url.searchParams.set('min_width', '854');
    url.searchParams.set('min_height', '480');
    url.searchParams.set('min_duration', '5');
    url.searchParams.set('max_duration', '300');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': apiKey,
        'User-Agent': 'HotInsert-Crawler/1.0',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      console.warn(`Pexels API error: ${response.status}`);
      return items;
    }

    const data = (await response.json()) as { videos: PexelsVideo[] };

    for (const video of data.videos ?? []) {
      if (items.length >= maxResults) break;

      // Pick best video file: prefer 720p, then closest below, must be landscape
      const files = video.video_files
        .filter((f) => f.height <= 720 && f.width >= 854)
        .sort((a, b) => b.height - a.height || b.width - a.width);

      if (files.length === 0) continue;

      // Map Pexels categories to our category system
      const category = guessCategory(video.url);

      items.push({
        id: `pexels-${video.id}`,
        title: `🔥 ${video.user?.name ?? 'Trending'}: ${video.id}`,
        category,
        description: `Pexels popular video by ${video.user?.name ?? 'unknown'}`,
        videoUrl: files[0].link,
        thumbnailUrl: video.image,
        duration: Math.round(video.duration),
        sourceUrl: video.url,
      });
    }
  } catch (err) {
    console.warn('Pexels source error:', err);
  }

  return items;
}

/** Guess a category from Pexels video tags/URL */
function guessCategory(url: string): VideoItem['category'] {
  const lower = url.toLowerCase();
  if (/sport|soccer|basketball|football|game|match|race|workout/.test(lower)) return 'sports';
  if (/music|concert|dance|song|band|guitar|piano|sing/.test(lower)) return 'music';
  if (/movie|film|cinema|scene|actor|trailer/.test(lower)) return 'movies';
  if (/news|report|interview|press|conference/.test(lower)) return 'news';
  return 'other';
}
