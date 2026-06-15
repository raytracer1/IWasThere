import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { uploadToR2, deleteFromR2, generateSignedUrl, signEventAssetUrls } from '../utils/r2';
import { MAX_THUMBNAIL_SIZE, DEFAULT_PAGE_SIZE } from '../shared';
import type { Event } from '../shared';
import type { Bindings } from '../types';

const adminRouter = new Hono<{ Bindings: Bindings }>();

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * POST /admin/upload — Upload a file, return R2 key.
 * Query: ?eventId=<uuid>&name=<thumbnail|background|reference>
 */
adminRouter.post('/upload', async (c) => {
  const eventId = c.req.query('eventId') || crypto.randomUUID();
  const name = c.req.query('name') || 'file';

  const formData = await c.req.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string') {
    return c.json({ success: false, error: 'No file provided' }, 400);
  }

  const uploadFile = file as unknown as UploadedFile;
  const ext = uploadFile.name.split('.').pop() || 'bin';
  const key = `events/${eventId}/${name}.${ext}`;

  await uploadToR2(c.env.ASSETS, key, await uploadFile.arrayBuffer(), uploadFile.type);

  const secret = c.env.AUTH_SECRET ?? 'dev-secret';
  const workerUrl = new URL(c.req.url).origin;
  const url = await generateSignedUrl(key, secret, workerUrl);

  return c.json({ success: true, data: { key, url } });
});

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

  // Sign R2 asset URLs
  const signed = await Promise.all(events.map((ev) => signEventAssetUrls(ev as unknown as Record<string, unknown>, secret, workerUrl)));

  return c.json({ success: true, data: signed, total, page, pageSize });
});

/**
 * GET /admin/events/:id — Single event detail (admin).
 */
adminRouter.get('/events/:id', async (c) => {
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

/**
 * POST /admin/events — Create a new event.
 * Multipart: thumbnail (optional) + JSON metadata
 */
adminRouter.post('/events', async (c) => {
  const db = new D1Helper(c.env.DB);
  const body = await c.req.json<Record<string, unknown>>();
  const id = (body.id as string) || crypto.randomUUID();

  // Validate required fields
  if (!body.title || !body.category || !body.generation) {
    return c.json({
      success: false,
      error: 'title, category, and generation are required',
    }, 400);
  }

  const gen = body.generation as Record<string, unknown>;
  if (!gen?.prompt_template) {
    return c.json({
      success: false,
      error: 'generation.prompt_template is required',
    }, 400);
  }

  await db.createEvent({
    id,
    title: body.title as string,
    category: body.category as string,
    event_type: body.event_type as string | undefined,
    scene: (body.scene as Record<string, unknown>) || {},
    emotion: (body.emotion as Record<string, unknown>) || {},
    camera: (body.camera as Record<string, unknown>) || {},
    user: (body.user as Record<string, unknown>) || {},
    entities: (body.entities as Record<string, unknown>) || {},
    moment: (body.moment as Record<string, unknown>) || {},
    generation: gen as unknown as Event['generation'],
    thumbnailUrl: body.thumbnailUrl as string | undefined,
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

  const body = await c.req.json<Record<string, unknown>>();

  await db.updateEvent(id, body);
  return c.json({ success: true, data: { id: existing.id } });
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

  // Delete all R2 assets
  const r2Keys = [
    event.thumbnailUrl,
    event.referenceVideo,
    (event.generation as unknown as Record<string, unknown>)?.background_image as string | undefined,
  ].filter(Boolean) as string[];

  for (const key of r2Keys) {
    try {
      await deleteFromR2(c.env.ASSETS, key);
    } catch { /* ignore R2 errors */ }
  }

  await db.deleteEvent(id);
  return c.json({ success: true });
});

export default adminRouter;
