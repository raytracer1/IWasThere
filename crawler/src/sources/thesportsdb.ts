import type { MatchEvent, EventTrigger } from '../types';

const API_KEY = '3'; // TheSportsDB free test key
const BASE = 'https://www.thesportsdb.com/api/v1/json';

// ─── Target Leagues ──────────────────────────────────────

interface LeagueConfig {
  name: string;          // substring match against strLeague
  weight: number;
}

const TARGET_LEAGUES: LeagueConfig[] = [
  // Soccer: only World Cup, Champions League, and Top 5 leagues
  { name: 'FIFA World Cup', weight: 100 },
  { name: 'UEFA Champions League', weight: 90 },
  { name: 'English Premier League', weight: 80 },
  { name: 'La Liga', weight: 70 },
  { name: 'Serie A', weight: 70 },
  { name: 'Bundesliga', weight: 70 },
  { name: 'Ligue 1', weight: 65 },
  // Basketball: NBA only
  { name: 'NBA', weight: 85 },
  // American Football
  { name: 'NFL', weight: 85 },
  // Baseball
  { name: 'MLB', weight: 60 },
  // Hockey
  // MMA
  { name: 'UFC', weight: 75 },
  // Formula 1
  { name: 'Formula 1', weight: 70 },
];

// Status values that indicate a match is currently in progress
const LIVE_STATUSES = new Set([
  'LIVE', '1H', '2H', 'ET',
  'Q1', 'Q2', 'Q3', 'Q4',
  'OT', 'HT', '2OT', '3OT',
  'BT',   // Break time
  'LIVE\'', '1H\'', '2H\'',
]);

const ROUND_MULTIPLIERS: Record<string, number> = {
  'final': 2.0,
  'semi-final': 1.5, 'semi finals': 1.5,
  'quarter-final': 1.3, 'quarter finals': 1.3,
  'round of 16': 1.2,
  'round of 32': 1.1,
};

// ─── Score cache (in-memory, between polls) ──────────────

const scoreCache = new Map<string, string>(); // eventId → "0-0"

// ─── Helpers ─────────────────────────────────────────────

function getLeagueWeight(leagueName: string): number {
  const lower = leagueName.toLowerCase();
  for (const cfg of TARGET_LEAGUES) {
    if (lower.includes(cfg.name.toLowerCase())) return cfg.weight;
  }
  return 10; // unknown league
}

function getRoundMultiplier(round: string): number {
  const lower = round.toLowerCase();
  for (const [key, mult] of Object.entries(ROUND_MULTIPLIERS)) {
    if (lower.includes(key)) return mult;
  }
  return 1.0;
}

function scoreImportance(prevScore: string, currScore: string): number {
  const [pH, pA] = prevScore.split('-').map(Number);
  const [cH, cA] = currScore.split('-').map(Number);
  if (isNaN(pH) || isNaN(pA) || isNaN(cH) || isNaN(cA)) return 1.0;

  // First goal (0→1 for either side)
  if (pH === 0 && pA === 0 && (cH > 0 || cA > 0)) return 1.5;
  // Equalizer
  if (pH !== pA && cH === cA) return 1.5;
  // Comeback / lead change
  if ((pH > pA && cH < cA) || (pH < pA && cH > cA)) return 1.3;
  // Extending lead (up by 2+)
  if (Math.abs(cH - cA) >= 2 && Math.abs(cH - cA) > Math.abs(pH - pA)) return 0.7;
  return 1.0;
}

// ─── Public API ──────────────────────────────────────────

/**
 * Fetch all matches for today from TheSportsDB.
 * Returns matches filtered to target leagues + LIVE status.
 */
// Known league IDs for eventsseason.php.
// TheSportsDB free key API: visit https://www.thesportsdb.com, search for the league,
// look at the URL: https://www.thesportsdb.com/league/{id}-{name}
// Then test: curl "https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id={id}&s=2026"
const LEAGUE_IDS: Record<string, number> = {
  // Soccer
  'fifa world cup': 4429,
  'uefa champions league': 4480,
  'english premier league': 4328,
  'spanish la liga': 4335,
  'italian serie a': 4332,
  'german bundesliga': 4331,
  'french ligue 1': 4334,
  // Basketball
  'nba': 4387,
  // American Football
  'nfl': 4391,
  // Baseball
  'mlb': 4424,
  // MMA
  'ufc': 4443,
  // Formula 1
  'formula 1': 4370,
};

export function isLiveStatus(status: string): boolean {
  return LIVE_STATUSES.has(status.toUpperCase().replace(/['']/g, "'"));
}

export async function fetchTodayMatches(): Promise<MatchEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const matches: MatchEvent[] = [];
  const seen = new Set<string>();

  // Only use eventsseason.php — returns complete match lists per league
  for (const [, leagueId] of Object.entries(LEAGUE_IDS)) {
    try {
      const r = await fetch(`${BASE}/${API_KEY}/eventsseason.php?id=${leagueId}&s=2026`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HotInsert/1.0)' },
        signal: AbortSignal.timeout(15_000),
      });
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      const data = await r.json() as { events?: any[] };
      for (const e of data?.events ?? []) {
        if (e.dateEvent !== today) continue;
        const id = e.idEvent ?? `${e.strHomeTeam}-${e.strAwayTeam}`;
        if (seen.has(id)) continue;
        seen.add(id);

        const m = toMatchEvent(e, today);
        if (m) matches.push(m);
      }
    } catch (err) {
      console.warn(`   TheSportsDB: league ${leagueId} fetch failed:`, String(err).slice(0, 80));
    }
  }

  return matches;
}

function toMatchEvent(e: any, today: string): MatchEvent | null {
  const leagueName: string = e.strLeague ?? '';
  const weight = getLeagueWeight(leagueName);
  if (weight < 30) return null;

  return {
    id: e.idEvent ?? `${e.strHomeTeam}-${e.strAwayTeam}`,
    homeTeam: e.strHomeTeam ?? 'Unknown',
    awayTeam: e.strAwayTeam ?? 'Unknown',
    league: leagueName,
    homeScore: e.intHomeScore !== null ? parseInt(e.intHomeScore) : null,
    awayScore: e.intAwayScore !== null ? parseInt(e.intAwayScore) : null,
    status: e.strStatus ?? '',
    time: e.strTime ?? '',
    date: e.dateEvent ?? today,
    round: e.intRound?.toString() ?? '',
    season: e.strSeason ?? '',
    venue: e.strVenue ?? '',
    group: e.strGroup ?? '',
  };
}

/**
 * Compare current matches against cached scores, generate event triggers.
 * Returns events sorted by hotness (highest first).
 */
export function detectEvents(matches: MatchEvent[]): EventTrigger[] {
  const triggers: EventTrigger[] = [];

  for (const match of matches) {
    const prevScore = scoreCache.get(match.id) ?? '0-0';
    const currScore = `${match.homeScore ?? 0}-${match.awayScore ?? 0}`;

    // No change → skip
    if (prevScore === currScore) continue;

    // Calculate hotness
    const leagueWeight = getLeagueWeight(match.league);
    const roundMult = getRoundMultiplier(match.round);
    const importance = scoreImportance(prevScore, currScore);
    const hotness = Math.round(leagueWeight * roundMult * importance);

    // Generate keywords
    const keywords = generateKeywords(match, currScore);

    triggers.push({
      match,
      previousScore: prevScore,
      currentScore: currScore,
      hotness,
      hotnessBreakdown: {
        league: leagueWeight,
        round: roundMult,
        importance,
      },
      triggeredAt: new Date().toISOString(),
      keywords,
    });

    // Update cache
    scoreCache.set(match.id, currScore);
  }

  // Also cache new matches that haven't been seen yet
  for (const match of matches) {
    if (!scoreCache.has(match.id)) {
      scoreCache.set(match.id, `${match.homeScore ?? 0}-${match.awayScore ?? 0}`);
    }
  }

  // Sort by hotness descending
  return triggers.sort((a, b) => b.hotness - a.hotness);
}

/**
 * Initialize score cache with current scores (avoids false triggers on first run).
 */
export function initScoreCache(matches: MatchEvent[]): void {
  for (const match of matches) {
    scoreCache.set(match.id, `${match.homeScore ?? 0}-${match.awayScore ?? 0}`);
  }
}

// ─── Keyword Generation ──────────────────────────────────

function generateKeywords(match: MatchEvent, score: string): string[] {
  const keywords: string[] = [];
  const year = match.season?.split('-')[0] || '2026'; // "2025-2026" → "2025"

  // Year-specific (most important — prevents old videos)
  keywords.push(`${match.homeTeam} ${match.awayTeam} ${year}`);
  keywords.push(`${match.homeTeam} ${match.awayTeam} goal ${year}`);
  keywords.push(`${match.homeTeam} ${match.awayTeam} ${year} ${match.league}`);

  // Score + year
  keywords.push(`${match.homeTeam} ${match.awayTeam} ${score} ${year}`);

  // Highlight
  keywords.push(`${match.homeTeam} highlight ${year}`);

  // Goal-scoring team
  const [hScore, aScore] = score.split('-').map(Number);
  if (hScore > aScore) {
    keywords.push(`${match.homeTeam} goal ${year}`);
  } else if (aScore > hScore) {
    keywords.push(`${match.awayTeam} goal ${year}`);
  }

  return keywords;
}
