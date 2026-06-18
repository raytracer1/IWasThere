import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { buildEventAssetUrls } from '../utils/r2';
import { DEFAULT_PAGE_SIZE } from '../shared';
import type { Bindings } from '../types';

const eventsRouter = new Hono<{ Bindings: Bindings }>();

/**
 * GET /events — List active events sorted by created_at DESC.
 * Query: ?category=, ?page=, ?pageSize=
 */
const FOOTBALL_TEAMS = [
  { name: "Argentina", code: "ar" }, { name: "Brazil", code: "br" }, { name: "England", code: "gb-eng" },
  { name: "France", code: "fr" }, { name: "Germany", code: "de" }, { name: "Spain", code: "es" },
  { name: "Portugal", code: "pt" }, { name: "Netherlands", code: "nl" }, { name: "Italy", code: "it" },
  { name: "Belgium", code: "be" }, { name: "Croatia", code: "hr" }, { name: "Uruguay", code: "uy" },
  { name: "Colombia", code: "co" }, { name: "Mexico", code: "mx" }, { name: "United States", code: "us" },
  { name: "Canada", code: "ca" }, { name: "Japan", code: "jp" }, { name: "South Korea", code: "kr" },
  { name: "Australia", code: "au" }, { name: "Morocco", code: "ma" }, { name: "Senegal", code: "sn" },
  { name: "Ghana", code: "gh" }, { name: "Egypt", code: "eg" }, { name: "Saudi Arabia", code: "sa" },
  { name: "Qatar", code: "qa" }, { name: "Iran", code: "ir" }, { name: "Norway", code: "no" },
  { name: "Sweden", code: "se" }, { name: "Switzerland", code: "ch" }, { name: "Austria", code: "at" },
  { name: "Scotland", code: "gb-sct" }, { name: "Türkiye", code: "tr" }, { name: "Czechia", code: "cz" },
  { name: "New Zealand", code: "nz" }, { name: "Paraguay", code: "py" }, { name: "Ecuador", code: "ec" },
  { name: "Ivory Coast", code: "ci" }, { name: "Tunisia", code: "tn" }, { name: "South Africa", code: "za" },
  { name: "Iraq", code: "iq" }, { name: "Jordan", code: "jo" }, { name: "Uzbekistan", code: "uz" },
  { name: "DR Congo", code: "cd" }, { name: "Panama", code: "pa" }, { name: "Algeria", code: "dz" },
  { name: "Cape Verde", code: "cv" }, { name: "Haiti", code: "ht" }, { name: "Curaçao", code: "cw" },
];

const BASKETBALL_TEAMS = [
  { name: "Atlanta Hawks", code: "atl" }, { name: "Boston Celtics", code: "bos" },
  { name: "Brooklyn Nets", code: "bkn" }, { name: "Charlotte Hornets", code: "cha" },
  { name: "Chicago Bulls", code: "chi" }, { name: "Cleveland Cavaliers", code: "cle" },
  { name: "Dallas Mavericks", code: "dal" }, { name: "Denver Nuggets", code: "den" },
  { name: "Detroit Pistons", code: "det" }, { name: "Golden State Warriors", code: "gsw" },
  { name: "Houston Rockets", code: "hou" }, { name: "Indiana Pacers", code: "ind" },
  { name: "LA Clippers", code: "lac" }, { name: "Los Angeles Lakers", code: "lal" },
  { name: "Memphis Grizzlies", code: "mem" }, { name: "Miami Heat", code: "mia" },
  { name: "Milwaukee Bucks", code: "mil" }, { name: "Minnesota Timberwolves", code: "min" },
  { name: "New Orleans Pelicans", code: "nop" }, { name: "New York Knicks", code: "nyk" },
  { name: "Oklahoma City Thunder", code: "okc" }, { name: "Orlando Magic", code: "orl" },
  { name: "Philadelphia 76ers", code: "phi" }, { name: "Phoenix Suns", code: "phx" },
  { name: "Portland Trail Blazers", code: "por" }, { name: "Sacramento Kings", code: "sac" },
  { name: "San Antonio Spurs", code: "sas" }, { name: "Toronto Raptors", code: "tor" },
  { name: "Utah Jazz", code: "uth" }, { name: "Washington Wizards", code: "was" },
];

function attachTeams(event: Record<string, unknown>): Record<string, unknown> {
  const category = event.category as string;
  if (category === 'football') return { ...event, teams: FOOTBALL_TEAMS };
  if (category === 'basketball') return { ...event, teams: BASKETBALL_TEAMS };
  return event;
}

const DISPLAY_TO_DB: Record<string, string[]> = {
  sports: ['football', 'basketball', 'tennis', 'athletics', 'cricket', 'boxing', 'american_football', 'other'],
};

eventsRouter.get('/', async (c) => {
  const db = new D1Helper(c.env.DB);
  const raw = c.req.query('category') || undefined;
  const categories = raw ? (DISPLAY_TO_DB[raw] || [raw]) : undefined;
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10);
  const publicBase = c.env.R2_PUBLIC_URL || `${new URL(c.req.url).origin}/public`;

  const { events, total } = await db.getActiveEvents(categories, page, pageSize);

  // Attach asset URLs and team lists
  const data = events.map((ev) => {
    const enriched = attachTeams(buildEventAssetUrls(ev as unknown as Record<string, unknown>, publicBase) as Record<string, unknown>);
    return enriched;
  });

  return c.json({ success: true, data, total, page, pageSize });
});

/**
 * GET /events/:id — Single event detail.
 */
eventsRouter.get('/:id', async (c) => {
  const db = new D1Helper(c.env.DB);
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';
  const workerUrl = new URL(c.req.url).origin;

  const event = await db.getEventById(c.req.param('id'));
  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  const data = attachTeams(buildEventAssetUrls(event as unknown as Record<string, unknown>, c.env.R2_PUBLIC_URL || `${new URL(c.req.url).origin}/public`) as Record<string, unknown>);
  return c.json({ success: true, data });
});

export default eventsRouter;
