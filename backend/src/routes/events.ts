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
const DISPLAY_TO_DB: Record<string, string[]> = {
  sports: ['football', 'basketball', 'tennis', 'athletics', 'cricket', 'boxing', 'american_football', 'other'],
};

eventsRouter.get('/', async (c) => {
  const db = new D1Helper(c.env.DB);
  const raw = c.req.query('category') || undefined;
  const categories = raw ? (DISPLAY_TO_DB[raw] || [raw]) : undefined;
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10);
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';
  const workerUrl = new URL(c.req.url).origin;

  const { events, total } = await db.getActiveEvents(categories, page, pageSize);

  // Sign R2 asset URLs
  const signed = await Promise.all(events.map((ev) => buildEventAssetUrls(ev as unknown as Record<string, unknown>, c.env.R2_PUBLIC_URL || `${new URL(c.req.url).origin}/public`)));

  return c.json({
    success: true,
    data: signed,
    total,
    page,
    pageSize,
  });
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

  const data = await buildEventAssetUrls(event as unknown as Record<string, unknown>, c.env.R2_PUBLIC_URL || `${new URL(c.req.url).origin}/public`);
  return c.json({ success: true, data });
});

export default eventsRouter;
