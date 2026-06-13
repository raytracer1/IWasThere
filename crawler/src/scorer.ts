import type { VideoItem, VideoCandidate, ScoredVideo, MatchEvent } from './types';

// ─── Event Hotness ───────────────────────────────────────

const LEAGUE_WEIGHTS: Record<string, number> = {
  'fifa world cup': 100,
  'uefa champions league': 90,
  'nba': 85,
  'nfl': 85,
  'english premier league': 80,
  'la liga': 70,
  'serie a': 70,
  'bundesliga': 70,
  'ligue 1': 65,
  'ufc': 75,
  'formula 1': 70,
  'mlb': 60,
  'nhl': 60,
  'mls': 45,
};

export function getLeagueWeight(league: string): number {
  const lower = league.toLowerCase();
  for (const [key, weight] of Object.entries(LEAGUE_WEIGHTS)) {
    if (lower.includes(key)) return weight;
  }
  return 10;
}

export function getRoundMultiplier(round: string): number {
  const lower = round.toLowerCase();
  if (lower.includes('final')) return 2.0;
  if (lower.includes('semi-final') || lower.includes('semi finals')) return 1.5;
  if (lower.includes('quarter')) return 1.3;
  if (lower.includes('round of 16') || lower.includes('round of 32')) return 1.2;
  return 1.0;
}

export function getScoreImportance(prevScore: string, currScore: string): number {
  const [pH, pA] = prevScore.split('-').map(Number);
  const [cH, cA] = currScore.split('-').map(Number);
  if (isNaN(pH) || isNaN(pA) || isNaN(cH) || isNaN(cA)) return 1.0;

  // First blood
  if (pH === 0 && pA === 0 && (cH > 0 || cA > 0)) return 1.5;
  // Equalizer
  if (pH !== pA && cH === cA) return 1.5;
  // Lead change
  if ((pH > pA && cH < cA) || (pH < pA && cH > cA)) return 1.3;
  // Extending lead
  if (Math.abs(cH - cA) >= 2 && Math.abs(cH - cA) > Math.abs(pH - pA)) return 0.7;
  return 1.0;
}

/**
 * Calculate event hotness score (0-300).
 * Above 40 → worth capturing.
 */
export function calculateEventHotness(
  league: string,
  round: string,
  prevScore: string,
  currScore: string
): { score: number; breakdown: Record<string, number> } {
  const leagueW = getLeagueWeight(league);
  const roundM = getRoundMultiplier(round);
  const importance = getScoreImportance(prevScore, currScore);
  const score = Math.round(leagueW * roundM * importance);

  return {
    score,
    breakdown: {
      league: leagueW,
      round: roundM,
      importance,
    },
  };
}

// ─── Video Relevance ─────────────────────────────────────

/**
 * Check if a video title is relevant to the event keywords.
 * Must contain at least one keyword (case-insensitive).
 */
export function isRelevant(title: string, keywords: string[]): boolean {
  const lower = title.toLowerCase();
  // Extract individual words from all keywords
  const terms = new Set<string>();
  for (const kw of keywords) {
    for (const word of kw.toLowerCase().split(/\s+/)) {
      if (word.length >= 3) terms.add(word);
    }
  }
  // Also add full keyword phrases
  for (const kw of keywords) {
    terms.add(kw.toLowerCase());
  }

  let matches = 0;
  for (const term of terms) {
    if (lower.includes(term)) matches++;
  }
  return matches >= 1;
}

// ─── Video Recency ───────────────────────────────────────

const MAX_AGE_MINUTES: Record<string, number> = {
  tiktok: 120,   // TikTok uploads take time
  reddit: 30,    // Reddit posts are fastest
  youtube: 240,  // YouTube processing is slow
};

export function isRecent(publishedAt: string, platform: string): boolean {
  const maxAge = MAX_AGE_MINUTES[platform] ?? 60;
  const pubTime = new Date(publishedAt).getTime();
  const ageMin = (Date.now() - pubTime) / 60_000;
  return ageMin < maxAge;
}

// ─── Video Quality Scoring ───────────────────────────────

const SPORTS_SUBS = new Set([
  'soccer', 'sports', 'nba', 'nfl', 'worldcup', 'mma', 'ufc',
  'formula1', 'hockey', 'baseball', 'tennis', 'cricket',
  'boxing', 'mls', 'nhl',
]);

const HIGHLIGHT_WORDS = /highlight|clip|goal|gol|touchdown|knockout|homerun|winner|banger|stunner|skills/i;

export function scoreVideo(
  video: VideoItem,
  platform: VideoCandidate['platform'],
  subreddit?: string,
  playCount?: number,
  duration?: number
): ScoredVideo {
  let score = 0;
  const breakdown: Record<string, number> = {};

  // Platform score
  if (platform === 'tiktok') {
    breakdown.platform = 40;
  } else if (platform === 'reddit' && subreddit && SPORTS_SUBS.has(subreddit.toLowerCase())) {
    breakdown.platform = 30;
  } else if (platform === 'reddit') {
    breakdown.platform = 15;
  } else if (platform === 'youtube') {
    breakdown.platform = 10;
  } else {
    breakdown.platform = 5;
  }
  score += breakdown.platform;

  // Content keywords
  if (HIGHLIGHT_WORDS.test(video.title)) {
    breakdown.highlight_kw = 15;
    score += 15;
  }

  // Duration: ideal 10-120 seconds
  if (duration !== undefined) {
    if (duration < 5) {
      breakdown.duration = -30;
      score -= 30;
    } else if (duration > 300) {
      breakdown.duration = -30;
      score -= 30;
    } else if (duration >= 10 && duration <= 120) {
      breakdown.duration = 10;
      score += 10;
    }
  }

  // Popularity signal
  if (playCount !== undefined) {
    if (playCount > 100_000) {
      breakdown.popularity = 20;
      score += 20;
    } else if (playCount > 10_000) {
      breakdown.popularity = 10;
      score += 10;
    } else if (playCount < 1000) {
      breakdown.popularity = -10;
      score -= 10;
    }
  }

  // Domain bonus (for Reddit links)
  const urlLower = video.videoUrl.toLowerCase();
  if (urlLower.includes('streamable.com') || urlLower.includes('streamja.com')) {
    breakdown.domain = 20;
    score += 20;
  } else if (urlLower.includes('v.redd.it')) {
    breakdown.domain = 15;
    score += 15;
  }

  return {
    ...video,
    score,
    scoreBreakdown: breakdown,
    platform,
    subreddit,
    playCount,
    publishedAt: new Date().toISOString(), // will be overwritten by actual data
    sourceUrl: video.sourceUrl,
  };
}

// ─── Dedup ───────────────────────────────────────────────

/**
 * Deduplicate videos by their actual video URL/ID.
 * Same video posted multiple times = keep only the first occurrence.
 */
export function deduplicateByVideo(videos: ScoredVideo[]): ScoredVideo[] {
  const seen = new Set<string>();
  const result: ScoredVideo[] = [];

  for (const v of videos) {
    const key = extractVideoKey(v.videoUrl, v.platform);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(v);
  }

  return result;
}

function extractVideoKey(url: string, platform: string): string {
  // YouTube: extract videoId
  if (platform === 'youtube') {
    const match = url.match(/(?:v=|\/)([\w-]{11})(?:&|$|\/)/);
    return match ? `yt:${match[1]}` : url;
  }
  // TikTok: extract video_id from sourceUrl
  if (platform === 'tiktok') {
    const match = url.match(/video\/(\d+)/);
    return match ? `tt:${match[1]}` : url;
  }
  // Streamable/other: use full URL
  return url;
}

// ─── Filter + Score Pipeline ─────────────────────────────

/**
 * Full pipeline: filter by relevance + recency, score, dedup, sort, limit.
 * Returns top N scored videos ready for download.
 */
export function filterAndScore(
  videos: VideoItem[],
  platform: VideoCandidate['platform'],
  keywords: string[],
  subreddit?: string,
  playCount?: number,
  maxResults = 5
): ScoredVideo[] {
  return videos
    // 1. Relevance filter
    .filter((v) => isRelevant(v.title, keywords))
    // 2. Score
    .map((v) => scoreVideo(v, platform, subreddit, playCount, v.duration))
    // 3. Recency filter
    .filter((v) => isRecent(v.publishedAt, platform))
    // 4. Quality threshold
    .filter((v) => v.score >= 50)
    // 5. Sort by score descending
    .sort((a, b) => b.score - a.score)
    // 6. Limit
    .slice(0, maxResults);
}
