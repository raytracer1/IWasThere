/** A raw video item scraped from a source */
export interface VideoItem {
  id: string;           // unique ID within the source
  title: string;
  category: 'sports' | 'music' | 'movies' | 'news' | 'other';
  description?: string;
  videoUrl: string;     // direct download URL (or page URL if need to scrape)
  thumbnailUrl?: string;
  duration?: number;    // seconds
  sourceUrl: string;    // original page URL for dedup
}

/** State file: track seen URLs to avoid duplicates */
export interface CrawlerState {
  seenUrls: string[];
  lastRun: string;      // ISO timestamp
}
