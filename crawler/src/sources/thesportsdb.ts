/**
 * Football-Data.org 比赛数据获取
 * 一次请求拿到当天所有比赛（比 TheSportsDB 12 次请求更稳定）
 */

import type { MatchEvent, EventTrigger } from '../types';

const API_BASE = 'https://api.football-data.org/v4';
const API_KEY = process.env.FOOTBALL_DATA_KEY ?? '';

// ─── Target Leagues ──────────────────────────────
const TARGET_LEAGUES: { name: string; weight: number }[] = [
  { name: 'FIFA World Cup', weight: 100 },
  { name: 'UEFA Champions League', weight: 90 },
  { name: 'Premier League', weight: 80 },
  { name: 'La Liga', weight: 70 },
  { name: 'Serie A', weight: 70 },
  { name: 'Bundesliga', weight: 70 },
  { name: 'Ligue 1', weight: 65 },
  { name: 'NBA', weight: 85 },
  { name: 'NFL', weight: 85 },
  { name: 'MLB', weight: 60 },
  { name: 'UFC', weight: 75 },
  { name: 'Formula 1', weight: 70 },
];

// Football-Data.org 状态 → 直播判断
const LIVE_STATUSES = new Set([
  'IN_PLAY', 'PAUSED',
  'LIVE', '1H', '2H', 'HT',  // 兼容 TheSportsDB 旧状态
]);

const ROUND_MULTIPLIERS: Record<string, number> = {
  'final': 2.0, 'semi-final': 1.5, 'semi finals': 1.5,
  'quarter-final': 1.3, 'quarter finals': 1.3,
  'round of 16': 1.2, 'round of 32': 1.1,
};

const scoreCache = new Map<string, string>();

// ─── Helpers ─────────────────────────────────────

function getLeagueWeight(leagueName: string): number {
  const lower = leagueName.toLowerCase();
  for (const cfg of TARGET_LEAGUES) {
    if (lower.includes(cfg.name.toLowerCase())) return cfg.weight;
  }
  return 10;
}

function getRoundMultiplier(stage: string): number {
  const lower = stage.toLowerCase();
  for (const [key, mult] of Object.entries(ROUND_MULTIPLIERS)) {
    if (lower.includes(key)) return mult;
  }
  return 1.0;
}

function scoreImportance(prevScore: string, currScore: string): number {
  const [pH, pA] = prevScore.split('-').map(Number);
  const [cH, cA] = currScore.split('-').map(Number);
  if (isNaN(pH) || isNaN(pA) || isNaN(cH) || isNaN(cA)) return 1.0;
  if (pH === 0 && pA === 0 && (cH > 0 || cA > 0)) return 1.5;
  if (pH !== pA && cH === cA) return 1.5;
  if ((pH > pA && cH < cA) || (pH < pA && cH > cA)) return 1.3;
  if (Math.abs(cH - cA) >= 2 && Math.abs(cH - cA) > Math.abs(pH - pA)) return 0.7;
  return 1.0;
}

// ─── Public API ──────────────────────────────────

export function isLiveStatus(status: string): boolean {
  return LIVE_STATUSES.has(status.toUpperCase().replace(/['']/g, "'"));
}

export async function fetchTodayMatches(): Promise<MatchEvent[]> {
  if (!API_KEY) {
    console.warn('  ⚠️  FOOTBALL_DATA_KEY not set');
    return [];
  }

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // 一次请求拿今明两天，最多重试 2 次
  const url = `${API_BASE}/matches?dateFrom=${today}&dateTo=${tomorrow}`;
  let data: any = null;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(url, {
          headers: { 'X-Auth-Token': API_KEY, 'Accept': 'application/json' },
          signal: AbortSignal.timeout(30_000),
        });
        data = await r.json();
        break;
      } catch (err) {
        if (attempt < 2) {
          console.warn(`   Football-Data attempt ${attempt + 1} failed, retrying...`);
          await new Promise(r => setTimeout(r, 2000));
        } else {
          throw err;
        }
      }
    }
    const allMatches = data?.matches ?? [];

    const matches: MatchEvent[] = [];
    const seen = new Set<string>();

    for (const m of allMatches) {
      const leagueName = m.competition?.name ?? '';
      const weight = getLeagueWeight(leagueName);
      if (weight < 30) continue;

      const id = String(m.id);
      if (seen.has(id)) continue;
      seen.add(id);

      const matchDate = (m.utcDate ?? '').slice(0, 10);

      matches.push({
        id,
        homeTeam: m.homeTeam?.name ?? 'Unknown',
        awayTeam: m.awayTeam?.name ?? 'Unknown',
        league: leagueName,
        homeScore: m.score?.fullTime?.home ?? null,
        awayScore: m.score?.fullTime?.away ?? null,
        status: m.status ?? 'SCHEDULED',
        time: m.utcDate?.slice(11, 19) ?? '',
        date: matchDate || today,
        round: m.stage ?? '',
        season: m.season?.startDate?.slice(0, 4) ?? '2026',
        venue: m.group ?? '',
        group: m.group ?? '',
      });
    }

    return matches;
  } catch (err) {
    console.warn('   Football-Data fetch error:', String(err).slice(0, 80));
    return [];
  }
}

export function detectEvents(matches: MatchEvent[]): EventTrigger[] {
  const triggers: EventTrigger[] = [];

  for (const match of matches) {
    const prevScore = scoreCache.get(match.id) ?? '0-0';
    const currScore = `${match.homeScore ?? 0}-${match.awayScore ?? 0}`;

    if (prevScore === currScore) continue;

    const leagueWeight = getLeagueWeight(match.league);
    const roundMult = getRoundMultiplier(match.round);
    const importance = scoreImportance(prevScore, currScore);
    const hotness = Math.round(leagueWeight * roundMult * importance);

    const keywords = generateKeywords(match, currScore);

    triggers.push({
      match,
      previousScore: prevScore,
      currentScore: currScore,
      hotness,
      hotnessBreakdown: { league: leagueWeight, round: roundMult, importance },
      triggeredAt: new Date().toISOString(),
      keywords,
    });

    scoreCache.set(match.id, currScore);
  }

  // 缓存新比赛
  for (const match of matches) {
    if (!scoreCache.has(match.id)) {
      scoreCache.set(match.id, `${match.homeScore ?? 0}-${match.awayScore ?? 0}`);
    }
  }

  return triggers.sort((a, b) => b.hotness - a.hotness);
}

export function initScoreCache(matches: MatchEvent[]): void {
  for (const match of matches) {
    scoreCache.set(match.id, `${match.homeScore ?? 0}-${match.awayScore ?? 0}`);
  }
}

// ─── Keywords ────────────────────────────────────

function generateKeywords(match: MatchEvent, score: string): string[] {
  const keywords: string[] = [];
  const year = match.season?.split('-')[0] || '2026';

  keywords.push(`${match.homeTeam} ${match.awayTeam} ${year}`);
  keywords.push(`${match.homeTeam} ${match.awayTeam} goal ${year}`);
  keywords.push(`${match.homeTeam} ${match.awayTeam} ${year} ${match.league}`);
  keywords.push(`${match.homeTeam} ${match.awayTeam} ${score} ${year}`);
  keywords.push(`${match.homeTeam} highlight ${year}`);

  const [hScore, aScore] = score.split('-').map(Number);
  if (hScore > aScore) {
    keywords.push(`${match.homeTeam} goal ${year}`);
  } else if (aScore > hScore) {
    keywords.push(`${match.awayTeam} goal ${year}`);
  }

  return keywords;
}
