import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { uploadToR2, deleteFromR2 } from '../utils/r2';
import { MAX_VIDEO_SIZE, MAX_THUMBNAIL_SIZE } from '@hotinsert/shared';
import type { CreateEventRequest, UpdateEventRequest } from '@hotinsert/shared';
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
  const status = formData.get('status') as string | null;
  const videoFile = formData.get('video');
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
  let videoKey: string | null = null;
  let thumbnailKey: string | null = null;

  // Upload video file
  if (videoFile && typeof videoFile !== 'string') {
    const vf = videoFile as unknown as { name: string; size: number; type: string; arrayBuffer(): Promise<ArrayBuffer> };
    if (vf.size > MAX_VIDEO_SIZE) {
      return c.json({
        success: false,
        error: `Video too large. Max ${MAX_VIDEO_SIZE / (1024 * 1024)}MB.`,
      }, 400);
    }
    const ext = vf.name.split('.').pop() || 'mp4';
    videoKey = `hot-events/${eventId}/video.${ext}`;
    await uploadToR2(c.env.ASSETS, videoKey, await vf.arrayBuffer(), vf.type);
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
    videoUrl: videoKey ?? '',
    thumbnailUrl: thumbnailKey ?? undefined,
    duration: duration ? parseInt(duration, 10) : undefined,
    status: (status as CreateEventRequest['status']) ?? 'draft',
    createdBy: user.id,
  });

  return c.json({
    success: true,
    data: { id: eventId, title, category },
  }, 201);
});

/**
 * PUT /admin/events/:id — Update event metadata.
 */
adminRouter.put('/events/:id', async (c) => {
  const db = new D1Helper(c.env.DB);
  const eventId = c.req.param('id');

  const existing = await db.getEventById(eventId);
  if (!existing) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  let body: UpdateEventRequest;
  try {
    body = await c.req.json<UpdateEventRequest>();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  if (body.category) {
    const validCategories = ['sports', 'music', 'movies', 'news', 'other'];
    if (!validCategories.includes(body.category)) {
      return c.json({ success: false, error: `Invalid category` }, 400);
    }
  }

  await db.updateEvent(eventId, body);

  return c.json({ success: true, data: { id: eventId } });
});

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
