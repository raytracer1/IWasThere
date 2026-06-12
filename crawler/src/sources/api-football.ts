/**
 * Football-Data.org 客户端
 *
 * 只在 TheSportsDB 检测到比分变化时调用（每场 3-5 次），
 * 免费版 10 次/分钟，完全够用。
 *
 * 功能：
 * 1. 根据球队名 + 日期查找 match ID
 * 2. 获取 match 的 goals（包含分钟数和球员）
 * 3. 返回最新进球的时间信息，计算 UTC 时间戳
 */

const API_BASE = 'https://api.football-data.org/v4';
const API_KEY = process.env.FOOTBALL_DATA_KEY ?? '';

// 世界杯 competition ID
const WORLD_CUP_ID = 2000;

export interface GoalEvent {
  /** 比赛分钟数（如 45, 90） */
  elapsed: number;
  /** 伤停补时分钟（如 3 表示 90+3） */
  extra: number | null;
  /** 进球球队名 */
  teamName: string;
  /** 进球球员名 */
  playerName: string;
  /** REGULAR / PENALTY / OWN */
  detail: string;
  /** 进球时的比分（如 "1-0"） */
  score: string;
}

export interface FixtureInfo {
  id: number;
  /** UTC 开球时间，ISO 格式 */
  kickoffUtc: string;
  homeTeam: string;
  awayTeam: string;
  /** 比赛状态: IN_PLAY, PAUSED, FINISHED 等 */
  status: string;
  /** 当前比赛分钟数 */
  elapsed: number | null;
}

// ─── HTTP helper ──────────────────────────────────

async function apiGet(path: string): Promise<any> {
  if (!API_KEY) return null;
  const r = await fetch(`${API_BASE}${path}`, {
    headers: {
      'X-Auth-Token': API_KEY,
      'X-Unfold-Goals': 'true', // 展开 goals 数据
    },
    signal: AbortSignal.timeout(10_000),
  });
  return r.json();
}

// ─── Public API ───────────────────────────────────

/**
 * 根据球队名 + 日期搜索正在进行的 match。
 * 只在比赛开始后调用一次，结果缓存。
 */
export async function findLiveFixture(
  homeTeam: string,
  awayTeam: string,
  date: string, // YYYY-MM-DD
): Promise<FixtureInfo | null> {
  if (!API_KEY) {
    console.warn('  ⚠️  FOOTBALL_DATA_KEY not set');
    return null;
  }

  try {
    // 查当天的所有比赛
    const data = await apiGet(`/matches?dateFrom=${date}&dateTo=${date}&status=LIVE`);
    const matches = data?.matches ?? [];
    if (matches.length === 0) {
      // 也试试 IN_PLAY 状态
      const data2 = await apiGet(`/matches?dateFrom=${date}&dateTo=${date}&status=IN_PLAY`);
      (data2?.matches ?? []).forEach((m: any) => matches.push(m));
    }

    // 模糊匹配球队名
    for (const m of matches) {
      const h = (m.homeTeam?.name ?? '').toLowerCase();
      const a = (m.awayTeam?.name ?? '').toLowerCase();
      const ht = homeTeam.toLowerCase();
      const at = awayTeam.toLowerCase();
      if (
        (h.includes(ht) || ht.includes(h)) &&
        (a.includes(at) || at.includes(a))
      ) {
        return {
          id: m.id,
          kickoffUtc: m.utcDate,
          homeTeam: m.homeTeam?.name ?? homeTeam,
          awayTeam: m.awayTeam?.name ?? awayTeam,
          status: m.status ?? '?',
          elapsed: m.minute ?? null,
        };
      }
    }

    return null;
  } catch (err) {
    console.warn('  ⚠️  Football-Data findLiveFixture error:', String(err).slice(0, 80));
    return null;
  }
}

/**
 * 获取 match 的最新进球事件。
 * 只在 TheSportsDB 检测到比分变化时调用。
 *
 * @param fixtureId Football-Data 的 match ID
 * @param knownCount 已知的进球数，只返回比这个多的新进球
 * @returns 进球事件列表（按时间排序，最新的在最后）
 */
export async function getGoalEvents(
  fixtureId: number,
  knownCount: number = 0,
): Promise<GoalEvent[]> {
  if (!API_KEY) {
    console.warn('  ⚠️  FOOTBALL_DATA_KEY not set');
    return [];
  }

  try {
    const data = await apiGet(`/matches/${fixtureId}`);
    const allGoals = data?.goals ?? [];

    // 转换为统一格式
    const goals: GoalEvent[] = [];
    for (const g of allGoals) {
      goals.push({
        elapsed: g.minute ?? 0,
        extra: g.injuryTime ?? null,
        teamName: g.team?.name ?? '',
        playerName: g.scorer?.name ?? '',
        detail: g.type === 'PENALTY' ? 'Penalty' : g.type === 'OWN' ? 'Own Goal' : 'Normal Goal',
        score: g.score ? `${g.score.home ?? 0}-${g.score.away ?? 0}` : '?-?',
      });
    }

    // 只返回新的进球
    if (goals.length > knownCount) {
      return goals.slice(knownCount);
    }
    return [];
  } catch (err) {
    console.warn('  ⚠️  Football-Data getGoalEvents error:', String(err).slice(0, 80));
    return [];
  }
}

/**
 * 用比赛开始时间 + 进球分钟数估算 UTC 时间。
 *
 * 比赛时钟规则：
 *   0-45 分钟: 上半场
 *   46-90 分钟: 下半场（需要加上 15 分钟中场休息）
 *   90+ 分钟: 伤停补时
 */
export function estimateGoalUtcMs(kickoffUtc: string, elapsed: number): number {
  const kickoff = new Date(kickoffUtc).getTime();

  let offsetSec: number;
  if (elapsed <= 45) {
    offsetSec = elapsed * 60;
  } else if (elapsed <= 90) {
    offsetSec = (elapsed + 15) * 60;
  } else {
    offsetSec = (elapsed + 15) * 60;
  }

  return kickoff + offsetSec * 1000;
}

// ─── Fixture ID 缓存 ──────────────────────────────

const fixtureCache = new Map<string, number>();

export function getCachedFixtureId(homeTeam: string, awayTeam: string, date: string): number | undefined {
  const key = `${homeTeam.toLowerCase()}-${awayTeam.toLowerCase()}-${date}`;
  return fixtureCache.get(key);
}

export function setCachedFixtureId(homeTeam: string, awayTeam: string, date: string, id: number): void {
  const key = `${homeTeam.toLowerCase()}-${awayTeam.toLowerCase()}-${date}`;
  fixtureCache.set(key, id);
}
