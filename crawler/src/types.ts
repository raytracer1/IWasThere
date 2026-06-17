/** A raw video item scraped from a source */
export interface VideoItem {
  id: string;           // unique ID within the source
  title: string;
  category: 'sports' | 'fiction' | 'history';
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

// ─── Event-driven types ──────────────────────────────────

/** A sports match from TheSportsDB API */
export interface MatchEvent {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;       // SCHEDULED, IN_PLAY, LIVE, FINISHED etc
  time: string;         // HH:MM:SS
  date: string;         // YYYY-MM-DD
  kickoffUtc: string;   // full ISO timestamp
  round: string;
  season: string;
  venue: string;
  group: string;
}

/** A video search result from any platform */
export interface VideoCandidate {
  id: string;              // unique within the source
  title: string;
  category: VideoItem['category'];
  description?: string;
  videoUrl: string;        // download URL
  thumbnailUrl?: string;
  duration?: number;       // seconds
  sourceUrl: string;       // permalink (for dedup of post)
  platform: 'tiktok' | 'reddit' | 'youtube';
  subreddit?: string;      // if from Reddit
  playCount?: number;      // TikTok plays / Reddit upvotes
  publishedAt: string;     // ISO timestamp
}

/** A video candidate with quality score */
export interface ScoredVideo extends VideoCandidate {
  score: number;
  scoreBreakdown: Record<string, number>;
}

/** An event that triggers video search */
export interface EventTrigger {
  match: MatchEvent;
  previousScore: string;   // "0-0"
  currentScore: string;    // "1-0"
  hotness: number;
  hotnessBreakdown: Record<string, number>;
  triggeredAt: string;     // ISO timestamp
  keywords: string[];
}
