import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { uploadToR2, deleteFromR2, generateSignedUrl } from '../utils/r2';
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
 * GET /admin/events — List all events (including drafts).
 */
adminRouter.get('/events', async (c) => {
  const db = new D1Helper(c.env.DB);
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';
  const workerUrl = new URL(c.req.url).origin;
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10);

  const { events, total } = await db.getAllEvents(page, pageSize);

  // Sign thumbnail & background R2 keys
  const signed = await Promise.all(events.map(async (ev) => ({
    ...ev,
    thumbnailUrl: ev.thumbnailUrl && !ev.thumbnailUrl.startsWith('http')
      ? await generateSignedUrl(ev.thumbnailUrl, secret, workerUrl)
      : ev.thumbnailUrl,
    generation: {
      ...ev.generation,
      background_image: ev.generation?.background_image && !ev.generation.background_image.startsWith('http')
        ? await generateSignedUrl(ev.generation.background_image, secret, workerUrl)
        : ev.generation?.background_image,
    },
  })));

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

  return c.json({
    success: true,
    data: {
      ...event,
      thumbnailUrl: event.thumbnailUrl && !event.thumbnailUrl.startsWith('http')
        ? await generateSignedUrl(event.thumbnailUrl, secret, workerUrl)
        : event.thumbnailUrl,
      generation: {
        ...event.generation,
        background_image: event.generation?.background_image && !event.generation.background_image.startsWith('http')
          ? await generateSignedUrl(event.generation.background_image, secret, workerUrl)
          : event.generation?.background_image,
      },
    },
  });
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

    // Handle background image upload
    const background = formData.get('background');
    if (background && typeof background !== 'string') {
      const bgFile = background as unknown as UploadedFile;
      const bgKey = `backgrounds/${crypto.randomUUID()}.${bgFile.name.split('.').pop() || 'jpg'}`;
      await uploadToR2(c.env.ASSETS, bgKey, await bgFile.arrayBuffer(), bgFile.type);
      const gen = (body.generation as Record<string, unknown>) || {};
      gen.background_image = bgKey;
      body.generation = gen;
    }
  } else {
    body = await c.req.json();
  }

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

  const id = crypto.randomUUID();

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

    // Handle background image upload
    const background = formData.get('background');
    if (background && typeof background !== 'string') {
      const bgFile = background as unknown as UploadedFile;
      const bgKey = `backgrounds/${crypto.randomUUID()}.${bgFile.name.split('.').pop() || 'jpg'}`;
      await uploadToR2(c.env.ASSETS, bgKey, await bgFile.arrayBuffer(), bgFile.type);
      const gen = (body.generation as Record<string, unknown>) || {};
      gen.background_image = bgKey;
      body.generation = gen;
    }
  } else {
    body = await c.req.json<Record<string, unknown>>();
  }

  if (thumbnailKey) {
    body.thumbnailUrl = thumbnailKey;
  }

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

  if (event.thumbnailUrl) {
    try {
      await deleteFromR2(c.env.ASSETS, event.thumbnailUrl);
    } catch { /* ignore R2 errors */ }
  }

  await db.deleteEvent(id);
  return c.json({ success: true });
});

export default adminRouter;
