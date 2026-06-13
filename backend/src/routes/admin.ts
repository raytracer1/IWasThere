import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { uploadToR2, deleteFromR2, generateSignedUrl } from '../utils/r2';
import { SPORT_TYPES, MAX_THUMBNAIL_SIZE, DEFAULT_PAGE_SIZE } from '../shared';
import type { Bindings } from '../types';

const adminRouter = new Hono<{ Bindings: Bindings }>();

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * GET /admin/events — List all events (including drafts).
 */
adminRouter.get('/events', async (c) => {
  const db = new D1Helper(c.env.DB);
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';
  const workerUrl = new URL(c.req.url).origin;
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10);

  const { events, total } = await db.getAllEvents(page, pageSize);

  // Sign thumbnail R2 keys
  const signed = await Promise.all(events.map(async (ev) => ({
    ...ev,
    thumbnailUrl: ev.thumbnailUrl && !ev.thumbnailUrl.startsWith('http')
      ? await generateSignedUrl(ev.thumbnailUrl, secret, workerUrl)
      : ev.thumbnailUrl,
  })));

  return c.json({ success: true, data: signed, total, page, pageSize });
});

/**
 * POST /admin/events — Create a new event.
 * Multipart: thumbnail (optional) + JSON metadata
 */
adminRouter.post('/events', async (c) => {
  const db = new D1Helper(c.env.DB);

  let thumbnailKey: string | undefined;
  let body: Record<string, unknown>;

  const contentType = c.req.header('Content-Type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData();
    const metadataStr = formData.get('metadata') as string;
    body = metadataStr ? JSON.parse(metadataStr) : {};
    const thumbnail = formData.get('thumbnail');

    if (thumbnail && typeof thumbnail !== 'string') {
      const file = thumbnail as unknown as UploadedFile;
      if (file.size > MAX_THUMBNAIL_SIZE) {
        return c.json({ success: false, error: 'Thumbnail too large' }, 400);
      }
      thumbnailKey = `events/${crypto.randomUUID()}.${file.name.split('.').pop() || 'jpg'}`;
      await uploadToR2(c.env.ASSETS, thumbnailKey, await file.arrayBuffer(), file.type);
    }
  } else {
    body = await c.req.json();
  }

  // Validate required fields
  if (!body.title || !body.year || !body.sportType || !body.imagePrompt) {
    return c.json({
      success: false,
      error: 'title, year, sportType, and imagePrompt are required',
    }, 400);
  }

  if (!SPORT_TYPES.includes(body.sportType as typeof SPORT_TYPES[number])) {
    return c.json({ success: false, error: `Invalid sportType. Use: ${SPORT_TYPES.join(', ')}` }, 400);
  }

  const id = body.id || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  await db.createEvent({
    id,
    title: body.title as string,
    year: body.year as number,
    location: body.location as string | undefined,
    sportType: body.sportType as typeof SPORT_TYPES[number],
    description: body.description as string | undefined,
    keyMoment: body.keyMoment as string | undefined,
    eraClothing: body.eraClothing as string | undefined,
    imagePrompt: body.imagePrompt as string,
    captionTemplates: body.captionTemplates as string | undefined,
    hashtags: body.hashtags as string | undefined,
    viralScore: (body.viralScore as number) ?? 5.0,
    thumbnailUrl: (body.thumbnailUrl as string) || thumbnailKey,
    status: (body.status as 'active' | 'draft' | 'archived') || 'active',
  });

  return c.json({ success: true, data: { id } });
});

/**
 * PUT /admin/events/:id — Update an event.
 */
adminRouter.put('/events/:id', async (c) => {
  const db = new D1Helper(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.getEventById(id);
  if (!existing) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  let thumbnailKey: string | undefined;
  let body: Record<string, unknown>;

  const contentType = c.req.header('Content-Type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData();
    const metadataStr = formData.get('metadata') as string;
    body = metadataStr ? JSON.parse(metadataStr) : {};
    const thumbnail = formData.get('thumbnail');

    if (thumbnail && typeof thumbnail !== 'string') {
      const file = thumbnail as unknown as UploadedFile;
      if (file.size > MAX_THUMBNAIL_SIZE) {
        return c.json({ success: false, error: 'Thumbnail too large' }, 400);
      }
      thumbnailKey = `events/${crypto.randomUUID()}.${file.name.split('.').pop() || 'jpg'}`;
      await uploadToR2(c.env.ASSETS, thumbnailKey, await file.arrayBuffer(), file.type);
    }
  } else {
    body = await c.req.json<Record<string, unknown>>();
  }

  if (body.sportType && !SPORT_TYPES.includes(body.sportType as typeof SPORT_TYPES[number])) {
    return c.json({ success: false, error: `Invalid sportType` }, 400);
  }

  if (thumbnailKey) {
    body.thumbnailUrl = thumbnailKey;
  }

  await db.updateEvent(id, body);
  return c.json({ success: true, data: { id } });
});

/**
 * DELETE /admin/events/:id — Delete an event and its R2 assets.
 */
adminRouter.delete('/events/:id', async (c) => {
  const db = new D1Helper(c.env.DB);
  const id = c.req.param('id');

  const event = await db.getEventById(id);
  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  if (event.thumbnailUrl) {
    try {
      await deleteFromR2(c.env.ASSETS, event.thumbnailUrl);
    } catch { /* ignore R2 errors */ }
  }

  await db.deleteEvent(id);
  return c.json({ success: true });
});

export default adminRouter;
