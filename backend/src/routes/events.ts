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
  { name: "Afghanistan", code: "af" }, { name: "Albania", code: "al" }, { name: "Algeria", code: "dz" },
  { name: "Andorra", code: "ad" }, { name: "Angola", code: "ao" }, { name: "Argentina", code: "ar" },
  { name: "Armenia", code: "am" }, { name: "Australia", code: "au" }, { name: "Austria", code: "at" },
  { name: "Azerbaijan", code: "az" }, { name: "Bahrain", code: "bh" }, { name: "Bangladesh", code: "bd" },
  { name: "Belarus", code: "by" }, { name: "Belgium", code: "be" }, { name: "Bolivia", code: "bo" },
  { name: "Bosnia", code: "ba" }, { name: "Brazil", code: "br" }, { name: "Bulgaria", code: "bg" },
  { name: "Cameroon", code: "cm" }, { name: "Canada", code: "ca" }, { name: "Chile", code: "cl" },
  { name: "China", code: "cn" }, { name: "Colombia", code: "co" }, { name: "Costa Rica", code: "cr" },
  { name: "Croatia", code: "hr" }, { name: "Cuba", code: "cu" }, { name: "Czechia", code: "cz" },
  { name: "Denmark", code: "dk" }, { name: "DR Congo", code: "cd" }, { name: "Ecuador", code: "ec" },
  { name: "Egypt", code: "eg" }, { name: "El Salvador", code: "sv" }, { name: "England", code: "gb-eng" },
  { name: "Estonia", code: "ee" }, { name: "Ethiopia", code: "et" }, { name: "Finland", code: "fi" },
  { name: "France", code: "fr" }, { name: "Georgia", code: "ge" }, { name: "Germany", code: "de" },
  { name: "Ghana", code: "gh" }, { name: "Greece", code: "gr" }, { name: "Guatemala", code: "gt" },
  { name: "Haiti", code: "ht" }, { name: "Honduras", code: "hn" }, { name: "Hungary", code: "hu" },
  { name: "Iceland", code: "is" }, { name: "India", code: "in" }, { name: "Indonesia", code: "id" },
  { name: "Iran", code: "ir" }, { name: "Iraq", code: "iq" }, { name: "Ireland", code: "ie" },
  { name: "Israel", code: "il" }, { name: "Italy", code: "it" }, { name: "Ivory Coast", code: "ci" },
  { name: "Jamaica", code: "jm" }, { name: "Japan", code: "jp" }, { name: "Jordan", code: "jo" },
  { name: "Kazakhstan", code: "kz" }, { name: "Kenya", code: "ke" }, { name: "Kuwait", code: "kw" },
  { name: "Latvia", code: "lv" }, { name: "Lebanon", code: "lb" }, { name: "Libya", code: "ly" },
  { name: "Lithuania", code: "lt" }, { name: "Luxembourg", code: "lu" }, { name: "Malaysia", code: "my" },
  { name: "Mali", code: "ml" }, { name: "Mexico", code: "mx" }, { name: "Moldova", code: "md" },
  { name: "Montenegro", code: "me" }, { name: "Morocco", code: "ma" }, { name: "Netherlands", code: "nl" },
  { name: "New Zealand", code: "nz" }, { name: "Nigeria", code: "ng" }, { name: "North Korea", code: "kp" },
  { name: "North Macedonia", code: "mk" }, { name: "Norway", code: "no" }, { name: "Oman", code: "om" },
  { name: "Pakistan", code: "pk" }, { name: "Panama", code: "pa" }, { name: "Paraguay", code: "py" },
  { name: "Peru", code: "pe" }, { name: "Philippines", code: "ph" }, { name: "Poland", code: "pl" },
  { name: "Portugal", code: "pt" }, { name: "Qatar", code: "qa" }, { name: "Romania", code: "ro" },
  { name: "Russia", code: "ru" }, { name: "Saudi Arabia", code: "sa" }, { name: "Scotland", code: "gb-sct" },
  { name: "Senegal", code: "sn" }, { name: "Serbia", code: "rs" }, { name: "Slovakia", code: "sk" },
  { name: "Slovenia", code: "si" }, { name: "South Africa", code: "za" }, { name: "South Korea", code: "kr" },
  { name: "Spain", code: "es" }, { name: "Sudan", code: "sd" }, { name: "Sweden", code: "se" },
  { name: "Switzerland", code: "ch" }, { name: "Syria", code: "sy" }, { name: "Thailand", code: "th" },
  { name: "Tunisia", code: "tn" }, { name: "Türkiye", code: "tr" }, { name: "Uganda", code: "ug" },
  { name: "Ukraine", code: "ua" }, { name: "UAE", code: "ae" }, { name: "Uruguay", code: "uy" },
  { name: "USA", code: "us" }, { name: "Uzbekistan", code: "uz" }, { name: "Venezuela", code: "ve" },
  { name: "Vietnam", code: "vn" }, { name: "Wales", code: "gb-wls" }, { name: "Zambia", code: "zm" },
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

const NBA_TEAM_IDS: Record<string, number> = {
  atl:1610612737,bos:1610612738,bkn:1610612751,cha:1610612766,chi:1610612741,cle:1610612739,
  dal:1610612742,den:1610612743,det:1610612765,gsw:1610612744,hou:1610612745,ind:1610612754,
  lac:1610612746,lal:1610612747,mem:1610612763,mia:1610612748,mil:1610612749,min:1610612750,
  nop:1610612740,nyk:1610612752,okc:1610612760,orl:1610612753,phi:1610612755,phx:1610612756,
  por:1610612757,sac:1610612758,sas:1610612759,tor:1610612761,uth:1610612762,was:1610612764,
};

function attachTeams(event: Record<string, unknown>): Record<string, unknown> {
  const category = event.category as string;
  if (category === 'football') {
    return { ...event, teams: FOOTBALL_TEAMS.map(t => ({ ...t, flag: `https://flagcdn.com/w80/${t.code}.png` })) };
  }
  if (category === 'basketball') {
    return { ...event, teams: BASKETBALL_TEAMS.map(t => ({ ...t, flag: `https://cdn.nba.com/logos/nba/${NBA_TEAM_IDS[t.code]}/primary/L/logo.svg` })) };
  }
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
