/**
 * Football-Data.org 统一数据源
 * — 比赛列表、直播状态、进球事件、时间估算
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

// ─── Goal Events & Timing ──────────────────────────

export interface GoalEvent {
  elapsed: number;
  extra: number | null;
  teamName: string;
  playerName: string;
  detail: string;
  score: string;
}

export interface FixtureInfo {
  id: number;
  kickoffUtc: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
  elapsed: number | null;
}

/**
 * 获取今天正在直播的所有比赛，用于控制录制启停。
 */
export async function getLiveMatches(date: string): Promise<FixtureInfo[]> {
  if (!API_KEY) return [];

  try {
    const results: FixtureInfo[] = [];
    for (const status of ['LIVE', 'IN_PLAY', 'PAUSED']) {
      const r = await fetch(`${API_BASE}/matches?dateFrom=${date}&dateTo=${date}&status=${status}`, {
        headers: { 'X-Auth-Token': API_KEY },
        signal: AbortSignal.timeout(30_000),
      });
      const data = await r.json();
      for (const m of data?.matches ?? []) {
        results.push({
          id: m.id,
          kickoffUtc: m.utcDate,
          homeTeam: m.homeTeam?.name ?? '',
          awayTeam: m.awayTeam?.name ?? '',
          status: m.status ?? '?',
          elapsed: m.minute ?? null,
        });
      }
    }
    return results;
  } catch (err) {
    console.warn('  ⚠️  getLiveMatches error:', String(err).slice(0, 80));
    return [];
  }
}

/**
 * 根据球队名 + 日期查找正在进行的 match。
 */
export async function findLiveFixture(
  homeTeam: string, awayTeam: string, date: string,
): Promise<FixtureInfo | null> {
  if (!API_KEY) return null;
  try {
    for (const status of ['LIVE', 'IN_PLAY', 'PAUSED']) {
      const r = await fetch(`${API_BASE}/matches?dateFrom=${date}&dateTo=${date}&status=${status}`, {
        headers: { 'X-Auth-Token': API_KEY, 'X-Unfold-Goals': 'true' },
        signal: AbortSignal.timeout(30_000),
      });
      const data = await r.json();
      for (const m of data?.matches ?? []) {
        const h = (m.homeTeam?.name ?? '').toLowerCase();
        const a = (m.awayTeam?.name ?? '').toLowerCase();
        if ((h.includes(homeTeam.toLowerCase()) || homeTeam.toLowerCase().includes(h)) &&
            (a.includes(awayTeam.toLowerCase()) || awayTeam.toLowerCase().includes(a))) {
          return { id: m.id, kickoffUtc: m.utcDate, homeTeam: m.homeTeam?.name ?? homeTeam, awayTeam: m.awayTeam?.name ?? awayTeam, status: m.status ?? '?', elapsed: m.minute ?? null };
        }
      }
    }
    return null;
  } catch (err) {
    console.warn('  ⚠️  findLiveFixture error:', String(err).slice(0, 80));
    return null;
  }
}

/**
 * 获取 match 的最新进球事件（只返回比 knownCount 多的新进球）。
 */
export async function getGoalEvents(fixtureId: number, knownCount = 0): Promise<GoalEvent[]> {
  if (!API_KEY) return [];
  try {
    const r = await fetch(`${API_BASE}/matches/${fixtureId}`, {
      headers: { 'X-Auth-Token': API_KEY },
      signal: AbortSignal.timeout(30_000),
    });
    const data = await r.json();
    const allGoals = data?.goals ?? [];
    const goals: GoalEvent[] = allGoals.map((g: any) => ({
      elapsed: g.minute ?? 0,
      extra: g.injuryTime ?? null,
      teamName: g.team?.name ?? '',
      playerName: g.scorer?.name ?? '',
      detail: g.type === 'PENALTY' ? 'Penalty' : g.type === 'OWN' ? 'Own Goal' : 'Normal Goal',
      score: g.score ? `${g.score.home ?? 0}-${g.score.away ?? 0}` : '?-?',
    }));
    return goals.length > knownCount ? goals.slice(knownCount) : [];
  } catch (err) {
    console.warn('  ⚠️  getGoalEvents error:', String(err).slice(0, 80));
    return [];
  }
}

/**
 * 用开球时间 + 进球分钟数估算 UTC 毫秒时间戳。
 * 上半场 0-45', 下半场 46-90'（+15' 中场休息）
 */
export function estimateGoalUtcMs(kickoffUtc: string, elapsed: number): number {
  const kickoff = new Date(kickoffUtc).getTime();
  const offsetSec = elapsed <= 45 ? elapsed * 60 : (elapsed + 15) * 60;
  return kickoff + offsetSec * 1000;
}

/**
 * 查找今天最近的开球时间（用于控制录制启停）。
 * 返回 null = 今天没有比赛需要录制。
 */
export async function getNearestKickoff(date: string): Promise<{ label: string; kickoffUtc: string; status: string } | null> {
  if (!API_KEY) return null;
  try {
    const r = await fetch(`${API_BASE}/matches?dateFrom=${date}&dateTo=${date}`, {
      headers: { 'X-Auth-Token': API_KEY },
      signal: AbortSignal.timeout(30_000),
    });
    const data = await r.json();
    const now = Date.now();
    let nearest: { label: string; kickoffUtc: string; status: string; diff: number } | null = null;

    for (const m of data?.matches ?? []) {
      const status = m.status ?? '';
      const kickoffUtc = m.utcDate ?? '';
      if (!kickoffUtc || status === 'FINISHED') continue;

      const kickoffMs = new Date(kickoffUtc).getTime();
      const diff = kickoffMs - now;
      const isLive = ['IN_PLAY', 'LIVE', 'PAUSED', '1H', '2H', 'HT'].includes(status);
      // 忽略 30 分钟后才开始的比赛
      if (!isLive && diff > 30 * 60 * 1000) continue;

      const label = `${m.homeTeam?.name ?? '?'} vs ${m.awayTeam?.name ?? '?'}`;
      if (!nearest || diff < nearest.diff) {
        nearest = { label, kickoffUtc, status, diff };
      }
    }
    return nearest ? { label: nearest.label, kickoffUtc: nearest.kickoffUtc, status: nearest.status } : null;
  } catch {
    return null;
  }
}

// ─── Fixture ID 缓存 ──────────────────────────────

const fixtureCache = new Map<string, number>();

export function getCachedFixtureId(homeTeam: string, awayTeam: string, date: string): number | undefined {
  return fixtureCache.get(`${homeTeam.toLowerCase()}-${awayTeam.toLowerCase()}-${date}`);
}

export function setCachedFixtureId(homeTeam: string, awayTeam: string, date: string, id: number): void {
  fixtureCache.set(`${homeTeam.toLowerCase()}-${awayTeam.toLowerCase()}-${date}`, id);
}
