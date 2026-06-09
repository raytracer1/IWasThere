import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { uploadToR2, deleteFromR2 } from '../utils/r2';
import { MAX_VIDEO_SIZE, MAX_THUMBNAIL_SIZE } from '../shared';
import type { CreateEventRequest, UpdateEventRequest } from '../shared';
import type { Bindings } from '../types';

const adminRouter = new Hono<{ Bindings: Bindings }>();

/**
 * GET /admin/events — List all events (including drafts, for admin management).
 */
adminRouter.get('/events', async (c) => {
  const db = new D1Helper(c.env.DB);
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') ?? '20', 10);

  const { events, total } = await db.getAllEvents(page, pageSize);

  return c.json({
    success: true,
    data: events,
    total,
    page,
    pageSize,
  });
});

/**
 * POST /admin/events — Create a new event with video and thumbnail uploads.
 */
adminRouter.post('/events', async (c) => {
  const user = c.get('user');
  const db = new D1Helper(c.env.DB);

  // Parse multipart form data
  const formData = await c.req.formData();

  const title = formData.get('title') as string | null;
  const category = formData.get('category') as string | null;
  const description = formData.get('description') as string | null;
  const duration = formData.get('duration') as string | null;
  const price = formData.get('price') as string | null;
  const trimRanges = formData.get('trimRanges') as string | null;
  const status = formData.get('status') as string | null;
  const videoFiles = formData.getAll('video'); // supports multiple clips
  const originalFile = formData.get('original');
  const thumbnailFile = formData.get('thumbnail');

  // Validate required fields
  if (!title || !category) {
    return c.json({ success: false, error: 'title and category are required' }, 400);
  }

  const validCategories = ['sports', 'music', 'movies', 'news', 'other'];
  if (!validCategories.includes(category)) {
    return c.json({ success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` }, 400);
  }

  const eventId = crypto.randomUUID();
  const videoKeys: string[] = [];
  let thumbnailKey: string | null = null;

  // Upload video file(s)
  const clipCount = parseInt(trimRanges ? (formData.get('clipCount') as string || '1') : '1', 10);
  let clipIndex = 0;
  for (const vf of videoFiles) {
    if (typeof vf === 'string') continue;
    const file = vf as unknown as { name: string; size: number; type: string; arrayBuffer(): Promise<ArrayBuffer> };
    if (file.size > MAX_VIDEO_SIZE) {
      return c.json({
        success: false,
        error: `Video too large. Max ${MAX_VIDEO_SIZE / (1024 * 1024)}MB.`,
      }, 400);
    }
    const ext = file.name.split('.').pop() || 'mp4';
    // Use sequential numbers for clips, UUID for fallback
    const name = clipCount > 1 ? `${clipIndex + 1}` : crypto.randomUUID();
    const key = `hot-events/${eventId}/${name}.${ext}`;
    await uploadToR2(c.env.ASSETS, key, await file.arrayBuffer(), file.type);
    videoKeys.push(key);
    clipIndex++;
  }

  // Upload original (untrimmed) video if provided
  let originalKey: string | null = null;
  if (originalFile && typeof originalFile !== 'string') {
    const of = originalFile as unknown as { name: string; size: number; type: string; arrayBuffer(): Promise<ArrayBuffer> };
    if (of.size <= MAX_VIDEO_SIZE) {
      const ext = of.name.split('.').pop() || 'mp4';
      originalKey = `hot-events/${eventId}/original.${ext}`;
      await uploadToR2(c.env.ASSETS, originalKey, await of.arrayBuffer(), of.type);
    }
  }

  // Upload thumbnail file
  if (thumbnailFile && typeof thumbnailFile !== 'string') {
    const tf = thumbnailFile as unknown as { name: string; size: number; type: string; arrayBuffer(): Promise<ArrayBuffer> };
    if (tf.size > MAX_THUMBNAIL_SIZE) {
      return c.json({
        success: false,
        error: `Thumbnail too large. Max ${MAX_THUMBNAIL_SIZE / (1024 * 1024)}MB.`,
      }, 400);
    }
    const ext = tf.name.split('.').pop() || 'jpg';
    thumbnailKey = `hot-events/${eventId}/thumbnail.${ext}`;
    await uploadToR2(c.env.ASSETS, thumbnailKey, await tf.arrayBuffer(), tf.type);
  }

  await db.createEvent({
    id: eventId,
    title,
    category: category as CreateEventRequest['category'],
    description: description ?? undefined,
    videoUrl: videoKeys[0] ?? '',
    videoKeys: videoKeys.length > 1 ? JSON.stringify(videoKeys) : undefined,
    thumbnailUrl: thumbnailKey ?? undefined,
    duration: duration ? parseInt(duration, 10) : undefined,
    price: price ? parseFloat(price) : undefined,
    trimRanges: trimRanges ?? undefined,
    status: (status as CreateEventRequest['status']) ?? 'draft',
    createdBy: user.id,
  });

  return c.json({
    success: true,
    data: { id: eventId, title, category },
  }, 201);
});

/**
 * POST /admin/events/:id/update — Update event with files (no CORS preflight issues).
 */
adminRouter.post('/events/:id/update', async (c) => {
  return handleEventUpdate(c);
});

/**
 * PUT /admin/events/:id — Update event (JSON metadata or multipart with files).
 */
adminRouter.put('/events/:id', async (c) => {
  return handleEventUpdate(c);
});

async function handleEventUpdate(c: import('hono').Context<{ Bindings: import('../types').Bindings }>) {
  const db = new D1Helper(c.env.DB);
  const eventId = c.req.param('id');

  const existing = await db.getEventById(eventId);
  if (!existing) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  const contentType = c.req.header('Content-Type') ?? '';
  console.log('PUT /admin/events/:id Content-Type:', contentType, 'method:', c.req.method);

  if (contentType.includes('multipart/form-data')) {
    // Delete old R2 files before re-upload
    try {
      const oldObjects = await c.env.ASSETS.list({ prefix: `hot-events/${eventId}/` });
      for (const obj of oldObjects.objects) {
        await c.env.ASSETS.delete(obj.key);
      }
    } catch {}
    // Handle multipart file re-upload
    const formData = await c.req.formData();
    const title = formData.get('title') as string | null;
    const category = formData.get('category') as string | null;
    const description = formData.get('description') as string | null;
    const price = formData.get('price') as string | null;
    const trimRanges = formData.get('trimRanges') as string | null;
    const status = formData.get('status') as string | null;
    const videoFiles = formData.getAll('video');
    const originalFile = formData.get('original');
    const thumbnailFile = formData.get('thumbnail');

    // Upload new files
    const videoKeys: string[] = [];
    for (const vf of videoFiles) {
      if (typeof vf === 'string') continue;
      const file = vf as unknown as { name: string; size: number; type: string; arrayBuffer(): Promise<ArrayBuffer> };
      const ext = file.name.split('.').pop() || 'mp4';
      const key = `hot-events/${eventId}/${file.name}`;
      await uploadToR2(c.env.ASSETS, key, await file.arrayBuffer(), file.type);
      videoKeys.push(key);
    }
    if (originalFile && typeof originalFile !== 'string') {
      const of = originalFile as unknown as { name: string; type: string; arrayBuffer(): Promise<ArrayBuffer> };
      await uploadToR2(c.env.ASSETS, `hot-events/${eventId}/original.mp4`, await of.arrayBuffer(), of.type);
    }
    if (thumbnailFile && typeof thumbnailFile !== 'string') {
      const tf = thumbnailFile as unknown as { name: string; type: string; arrayBuffer(): Promise<ArrayBuffer> };
      await uploadToR2(c.env.ASSETS, `hot-events/${eventId}/thumbnail.jpg`, await tf.arrayBuffer(), tf.type);
    }

    // Update metadata
    const updates: Record<string, unknown> = {};
    if (title) updates.title = title;
    if (category) updates.category = category;
    if (description !== null) updates.description = description || null;
    if (price) updates.price = parseFloat(price);
    if (status) updates.status = status;
    if (trimRanges) updates.trimRanges = trimRanges;
    if (videoKeys.length > 0) {
      updates.videoUrl = videoKeys[0];
      updates.videoKeys = videoKeys.length > 1 ? JSON.stringify(videoKeys) : null;
    }
    await db.updateEvent(eventId, updates);
    return c.json({ success: true, data: { id: eventId } });
  }

  // Fallback: JSON metadata only
  let body: UpdateEventRequest;
  try {
    body = await c.req.json<UpdateEventRequest>();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  if (body.category) {
    const validCategories = ['sports', 'music', 'movies', 'news', 'other'];
    if (!validCategories.includes(body.category)) {
      return c.json({ success: false, error: 'Invalid category' }, 400);
    }
  }

  if (body.trimRanges !== undefined) {
    await db.run('UPDATE events SET trim_ranges = ? WHERE id = ?', body.trimRanges as string, eventId);
  }
  await db.updateEvent(eventId, body);

  return c.json({ success: true, data: { id: eventId } });
}

/**
 * DELETE /admin/events/:id — Delete event and associated R2 files.
 */
adminRouter.delete('/events/:id', async (c) => {
  const db = new D1Helper(c.env.DB);
  const eventId = c.req.param('id');

  const event = await db.getEventById(eventId);
  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  // Delete R2 files
  if (event.videoUrl) {
    await deleteFromR2(c.env.ASSETS, event.videoUrl).catch(() => {});
  }
  if (event.thumbnailUrl) {
    await deleteFromR2(c.env.ASSETS, event.thumbnailUrl).catch(() => {});
  }

  // Delete R2 directory (list and delete all objects under hot-events/{eventId}/)
  try {
    const objects = await c.env.ASSETS.list({ prefix: `hot-events/${eventId}/` });
    for (const obj of objects.objects) {
      await c.env.ASSETS.delete(obj.key);
    }
  } catch {
    // Non-critical — event record will still be deleted
  }

  await db.deleteEvent(eventId);

  return c.json({ success: true, data: { id: eventId } });
});

export default adminRouter;
