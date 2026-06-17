import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { signEventAssetUrls } from '../utils/r2';
import { DEFAULT_PAGE_SIZE } from '../shared';
import type { Bindings } from '../types';

const eventsRouter = new Hono<{ Bindings: Bindings }>();

/**
 * GET /events — List active events sorted by created_at DESC.
 * Query: ?category=, ?page=, ?pageSize=
 */
eventsRouter.get('/', async (c) => {
  const db = new D1Helper(c.env.DB);
  const category = c.req.query('category') || undefined;
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10);
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';
  const workerUrl = new URL(c.req.url).origin;

  const { events, total } = await db.getActiveEvents(category, page, pageSize);

  // Sign R2 asset URLs
  const signed = await Promise.all(events.map((ev) => signEventAssetUrls(ev as unknown as Record<string, unknown>, secret, workerUrl, c.env.R2_PUBLIC_URL)));

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

  const data = await signEventAssetUrls(event as unknown as Record<string, unknown>, secret, workerUrl);
  return c.json({ success: true, data });
});

export default eventsRouter;
