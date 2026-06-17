import RssParser from 'rss-parser';
import type { VideoItem } from '../types';

const parser = new RssParser();

const RSS_FEEDS: { url: string; category: VideoItem['category'] }[] = [
  { url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en', category: 'history' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'history' },
  { url: 'https://www.espn.com/espn/rss/news', category: 'sports' },
  { url: 'https://feeds.reuters.com/reuters/topNews', category: 'history' },
];

/**
 * Fetch trending headlines from Google News + other RSS feeds.
 * Uses rss-parser to extract article titles and links.
 * Video downloads from these articles are handled by yt-dlp
 * (which can extract embedded videos from article pages).
 */
export async function fetchNewsItems(maxResults: number): Promise<VideoItem[]> {
  const items: VideoItem[] = [];

  for (const { url, category } of RSS_FEEDS) {
    if (items.length >= maxResults) break;

    try {
      const feed = await parser.parseURL(url);

      for (const item of feed.items ?? []) {
        if (items.length >= maxResults) break;
        if (!item.title || !item.link) continue;

        const id = `news-${Buffer.from(item.link).toString('base64').slice(0, 20)}`;

        items.push({
          id,
          title: item.title.slice(0, 100),
          category,
          description: item.contentSnippet?.slice(0, 200) ?? undefined,
          videoUrl: item.link, // yt-dlp will try to extract video from the article
          thumbnailUrl: undefined,
          sourceUrl: item.link,
        });
      }
    } catch (err) {
      console.warn(`RSS source error (${url}):`, err);
    }
  }

  return items.slice(0, maxResults);
}
