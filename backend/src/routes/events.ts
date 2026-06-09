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
  try {
    const db = new D1Helper(c.env.DB);
    const category = c.req.query('category') as EventCategory | undefined;
    const page = parseInt(c.req.query('page') ?? '1', 10);
    const pageSize = parseInt(c.req.query('pageSize') ?? '20', 10);

    const { events, total } = await db.getActiveEvents(category, page, pageSize);

    const baseUrl = new URL(c.req.url).origin;
    const secret = c.env.AUTH_SECRET ?? 'dev-secret';

    // Only generate signed URLs if there are events
    let eventsWithUrls;
    try {
      eventsWithUrls = await Promise.all(
        events.map(async (event) => ({
          ...event,
          videoUrl: await generateSignedUrl(event.videoUrl, secret, baseUrl),
          thumbnailUrl: event.thumbnailUrl
            ? await generateSignedUrl(event.thumbnailUrl, secret, baseUrl)
            : undefined,
        }))
      );
    } catch (signErr) {
      console.error('Signed URL generation error:', signErr);
      // Return events as-is without signed URLs if signing fails
      eventsWithUrls = events;
    }

    return c.json({
      success: true,
      data: eventsWithUrls,
      total,
      page,
      pageSize,
    });
  } catch (err) {
    console.error('GET /events error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ success: false, error: `Internal error: ${message}` }, 500);
  }
});

/**
 * GET /events/:id — Get single event detail.
 */
eventsRouter.get('/:id', async (c) => {
  try {
    const db = new D1Helper(c.env.DB);
    const event = await db.getEventById(c.req.param('id'));

    if (!event) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }

    const baseUrl = new URL(c.req.url).origin;
    const secret = c.env.AUTH_SECRET ?? 'dev-secret';

    // Build original video URL (full compressed video for re-editing)
    let originalVideoUrl: string | undefined;
    const eventId = c.req.param('id');
    // Always try to find original file
    const candidates = ['mp4', 'webm'];
    for (const ext of candidates) {
      const key = `hot-events/${eventId}/original.${ext}`;
      const obj = await c.env.ASSETS.head(key);
      console.log(`Checking original key: ${key}, found:`, !!obj);
      if (obj) {
        originalVideoUrl = await generateSignedUrl(key, secret, baseUrl);
        break;
      }
    }
    // Also check R2 listing for any original file
    if (!originalVideoUrl) {
      const listObj = await c.env.ASSETS.list({ prefix: `hot-events/${eventId}/original.` });
      const found = listObj.objects.find((o) => o.key.startsWith(`hot-events/${eventId}/original.`));
      if (found) {
        console.log(`Found via list: ${found.key}`);
        originalVideoUrl = await generateSignedUrl(found.key, secret, baseUrl);
      }
    }

    return c.json({
      success: true,
      data: {
        ...event,
        videoUrl: await generateSignedUrl(event.videoUrl, secret, baseUrl),
        thumbnailUrl: event.thumbnailUrl
          ? await generateSignedUrl(event.thumbnailUrl, secret, baseUrl)
          : undefined,
        originalVideoUrl,
      },
    });
  } catch (err) {
    console.error('GET /events/:id error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ success: false, error: `Internal error: ${message}` }, 500);
  }
});

export default eventsRouter;
