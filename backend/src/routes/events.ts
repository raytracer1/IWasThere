import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { generateSignedUrl } from '../utils/r2';
import type { EventCategory } from '../shared';
import type { Bindings } from '../types';

const eventsRouter = new Hono<{ Bindings: Bindings }>();

/**
 * GET /events — List active trending events (paginated, optional category filter).
 */
eventsRouter.get('/', async (c) => {
  const db = new D1Helper(c.env.DB);
  const category = c.req.query('category') as EventCategory | undefined;
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') ?? '20', 10);

  const { events, total } = await db.getActiveEvents(category, page, pageSize);

  // Generate signed URLs for each event's video/thumbnail
  const baseUrl = new URL(c.req.url).origin;
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';

  const eventsWithUrls = await Promise.all(
    events.map(async (event) => ({
      ...event,
      videoUrl: await generateSignedUrl(event.videoUrl, secret, baseUrl),
      thumbnailUrl: event.thumbnailUrl
        ? await generateSignedUrl(event.thumbnailUrl, secret, baseUrl)
        : undefined,
    }))
  );

  return c.json({
    success: true,
    data: eventsWithUrls,
    total,
    page,
    pageSize,
  });
});

/**
 * GET /events/:id — Get single event detail.
 */
eventsRouter.get('/:id', async (c) => {
  const db = new D1Helper(c.env.DB);
  const event = await db.getEventById(c.req.param('id'));

  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  const baseUrl = new URL(c.req.url).origin;
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';

  return c.json({
    success: true,
    data: {
      ...event,
      videoUrl: await generateSignedUrl(event.videoUrl, secret, baseUrl),
      thumbnailUrl: event.thumbnailUrl
        ? await generateSignedUrl(event.thumbnailUrl, secret, baseUrl)
        : undefined,
    },
  });
});

/**
 * GET /events/categories — List available categories with event counts.
 */
eventsRouter.get('/categories/list', async (c) => {
  const db = new D1Helper(c.env.DB);

  const categories = ['sports', 'music', 'movies', 'news', 'other'] as const;
  const counts: Record<string, number> = {};

  for (const cat of categories) {
    const row = await db['first']<{ count: number }>(
      `SELECT COUNT(*) as count FROM events WHERE status = 'active' AND category = ?`,
      cat
    );
    counts[cat] = row?.count ?? 0;
  }

  return c.json({ success: true, data: counts });
});

export default eventsRouter;
