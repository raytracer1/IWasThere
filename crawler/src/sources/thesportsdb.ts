import type { MatchEvent, EventTrigger } from '../types';

const API_KEY = '3'; // TheSportsDB free test key
const BASE = 'https://www.thesportsdb.com/api/v1/json';

// ─── Target Leagues ──────────────────────────────────────

interface LeagueConfig {
  name: string;          // substring match against strLeague
  weight: number;
}

const TARGET_LEAGUES: LeagueConfig[] = [
  // Soccer
  { name: 'FIFA World Cup', weight: 100 },
  { name: 'UEFA Champions League', weight: 90 },
  { name: 'English Premier League', weight: 80 },
  { name: 'La Liga', weight: 70 },
  { name: 'Serie A', weight: 70 },
  { name: 'Bundesliga', weight: 70 },
  { name: 'Ligue 1', weight: 65 },
  { name: 'Eredivisie', weight: 50 },
  { name: 'MLS', weight: 45 },
  { name: 'Primeira Liga', weight: 50 },
  { name: 'EFL Championship', weight: 40 },
  // Basketball
  { name: 'NBA', weight: 85 },
  // American Football
  { name: 'NFL', weight: 85 },
  // Baseball
  { name: 'MLB', weight: 60 },
  // Hockey
  { name: 'NHL', weight: 60 },
  // MMA
  { name: 'UFC', weight: 75 },
  // Formula 1
  { name: 'Formula 1', weight: 70 },
];

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
export async function fetchTodayMatches(): Promise<MatchEvent[]> {
  const today = new Date().toISOString().slice(0, 10);
  const matches: MatchEvent[] = [];

  // Fetch soccer and other sports in parallel
  const sports = ['Soccer', 'Basketball', 'American_Football', 'Baseball', 'Ice_Hockey', 'Motorsport'];
  const responses = await Promise.allSettled(
    sports.map(sport =>
      fetch(`${BASE}/${API_KEY}/eventsday.php?d=${today}&s=${sport}`, {
        signal: AbortSignal.timeout(10_000),
      }).then(r => r.json())
    )
  );

  for (const result of responses) {
    if (result.status !== 'fulfilled') continue;
    const data = result.value as { events?: any[] };
    if (!data?.events) continue;

    for (const e of data.events) {
      const leagueName: string = e.strLeague ?? '';
      const status: string = e.strStatus ?? '';

      // Only collect matches from target leagues
      const weight = getLeagueWeight(leagueName);
      if (weight < 30) continue; // skip obscure leagues entirely

      matches.push({
        id: e.idEvent ?? `${e.strHomeTeam}-${e.strAwayTeam}`,
        homeTeam: e.strHomeTeam ?? 'Unknown',
        awayTeam: e.strAwayTeam ?? 'Unknown',
        league: leagueName,
        homeScore: e.intHomeScore !== null ? parseInt(e.intHomeScore) : null,
        awayScore: e.intAwayScore !== null ? parseInt(e.intAwayScore) : null,
        status,
        time: e.strTime ?? '',
        date: e.dateEvent ?? today,
        round: e.intRound?.toString() ?? '',
        season: e.strSeason ?? '',
        venue: e.strVenue ?? '',
        group: e.strGroup ?? '',
      });
    }
  }

  return matches;
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

  // Core: team names
  keywords.push(`${match.homeTeam} ${match.awayTeam} goal`);
  keywords.push(`${match.homeTeam} goal ${match.league}`);

  // Score-based
  keywords.push(`${match.homeTeam} ${match.awayTeam} ${score}`);

  // Highlight/clip variants
  keywords.push(`${match.homeTeam} highlight ${match.league}`);

  // Goal-scoring team emphasized
  const [hScore, aScore] = score.split('-').map(Number);
  if (hScore > aScore) {
    keywords.push(`${match.homeTeam} goal`);
  } else if (aScore > hScore) {
    keywords.push(`${match.awayTeam} goal`);
  }

  // Multi-language
  keywords.push(`${match.homeTeam} ${match.awayTeam} gol`);

  return keywords;
}
