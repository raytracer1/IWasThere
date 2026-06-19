import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { uploadToR2, deleteFromR2, generateSignedUrl, buildEventAssetUrls } from '../utils/r2';
import { generateImageFromText, submitVideo } from '../utils/agnes';
import { buildEnrichSuffix } from '../utils/promptBuilder';
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

  // Thumbnails & backgrounds go to public bucket, videos to private
  const isPublic = name === 'thumbnail' || name === 'background';
  const bucket = isPublic ? c.env.PUBLIC : c.env.ASSETS;
  await uploadToR2(bucket, key, await uploadFile.arrayBuffer(), uploadFile.type);

  const secret = c.env.AUTH_SECRET ?? 'dev-secret';
  const workerUrl = new URL(c.req.url).origin;
  const url = isPublic
    ? `${c.env.R2_PUBLIC_URL || workerUrl + '/public'}/${key}`
    : await generateSignedUrl(key, secret, workerUrl);

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
  const signed = await Promise.all(events.map((ev) => buildEventAssetUrls(ev as unknown as Record<string, unknown>, c.env.R2_PUBLIC_URL || `${new URL(c.req.url).origin}/public`)));

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

  const data = buildEventAssetUrls(event as unknown as Record<string, unknown>, c.env.R2_PUBLIC_URL || `${new URL(c.req.url).origin}/public`);
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
    aspectRatio: body.aspectRatio as string | undefined,
    price: (body.price as number) ?? 0,
    scene: (body.scene as Record<string, unknown>) || {},
    camera: (body.camera as Record<string, unknown>) || {},
    generation: gen as unknown as Event['generation'],
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

  // Detach generations (set event_id to null) so FK doesn't block delete
  await db.nullifyGenerationsEvent(event.id);

  // Delete all R2 assets (pattern: events/{id}/{type}.{ext})
  const r2Keys = [
    `events/${event.id}/thumbnail.webp`,
    `events/${event.id}/background.webp`,
    `events/${event.id}/reference.mp4`,
  ];

  for (const key of r2Keys) {
    try {
      await deleteFromR2(c.env.ASSETS, key);
    } catch { /* ignore R2 errors */ }
  }

  await db.deleteEvent(id);
  return c.json({ success: true });
});

// POST /admin/events/:id/generate-assets — Generate background image + reference video via AI
adminRouter.post('/events/:id/generate-assets', async (c) => {
  const db = new D1Helper(c.env.DB);
  const apiKey = c.env.AGNES_API_KEY;
  if (!apiKey) return c.json({ success: false, error: 'Agnes AI not configured' }, 500);

  const event = await db.getEventById(c.req.param('id'));
  if (!event) return c.json({ success: false, error: 'Event not found' }, 404);

  const formData = await c.req.json() as Record<string, unknown> || {};
  const ratio = (formData.aspectRatio as string) || event.aspectRatio || '16:9';
  const promptTemplate = (formData.promptTemplate as string) || event.generation?.prompt_template || '';
  const negativePrompt = (formData.negativePrompt as string) || event.generation?.negative_prompt || '';
  const scene = (formData.scene as Record<string, unknown>) || event.scene || {};
  // Replace placeholders with neutral values for generic background
  const genericPrompt = promptTemplate
    .replace(/\{team_a\}/g, 'Team A')
    .replace(/\{team_b\}/g, 'Team B')
    .replace(/\{score\}/g, '0-0')
    .replace(/\{user_team\}/g, 'Team A')
    .replace(/\{mood\}/g, 'excited')
    .replace(/\{event\}/g, (formData.title as string) || event.title)
    .replace(/\{location\}/g, (scene.location as string) || (event.scene?.location as string) || '')
    .replace(/\{time_period\}/g, (scene.time_period as string) || (event.scene?.time_period as string) || '');

  try {
    // 1. Generate background image from text
    const enrich = buildEnrichSuffix(scene, event.camera as Record<string, unknown> || {});
    const bgPrompt = `Ultra-realistic stadium scene: ${scene.venue || 'stadium'}, ${scene.time_period || ''}, ${scene.lighting || 'night'} lighting, packed crowd. ${genericPrompt}${enrich}`;
    const sizeMap: Record<string, string> = { '9:16': '720x1280', '16:9': '1280x720', '1:1': '720x720', '4:3': '960x720', '3:4': '720x960' };
    const size = sizeMap[ratio] || '1280x720';
    const [w, h] = size.split('x').map(Number);

    const bgImageUrl = await generateImageFromText(bgPrompt, apiKey, size);
    console.log(`[admin] Background image: ${bgImageUrl}`);

    // Download and store in R2 (public bucket)
    let bgKey: string | undefined;
    try {
      const bgResp = await fetch(bgImageUrl);
      if (bgResp.ok) {
        bgKey = `events/${event.id}/background.webp`;
        await uploadToR2(c.env.PUBLIC, bgKey, await bgResp.arrayBuffer(), 'image/webp');
      }
    } catch {}

    const publicBase = c.env.R2_PUBLIC_URL || `${new URL(c.req.url).origin}/public`;
    const bgStoredUrl = bgKey ? `${publicBase}/${bgKey}` : bgImageUrl;

    // 2. Generate reference video from the background image
    const videoPrompt = genericPrompt + enrich;
    const videoTaskId = await submitVideo(videoPrompt, bgImageUrl, apiKey, 121, 24, w, h, negativePrompt);
    console.log(`[admin] Video task: ${videoTaskId}`);

    // Update the event (cron will poll for video completion)
    await db.updateEvent(event.id, {
      pendingVideoTask: videoTaskId,
    });

    return c.json({ success: true, data: { bgImageUrl, videoTaskId } });
  } catch (err) {
    return c.json({ success: false, error: err instanceof Error ? err.message : 'Generation failed' }, 500);
  }
});

export default adminRouter;
