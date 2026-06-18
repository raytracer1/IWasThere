import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { generateSignedUrl } from '../utils/r2';
import type { Bindings } from '../types';

const generationRouter = new Hono<{ Bindings: Bindings }>();

/** GET / — List user's generations */
generationRouter.get('/', async (c) => {
  const db = new D1Helper(c.env.DB);
  const user = c.get('user');
  const dbUser = await db.getUserByEmail(user.email);
  const userId = dbUser?.id || user.id;
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') ?? '20', 10);
  const { generations, total } = await db.getUserGenerations(userId, page, pageSize);

  // Build full thumbnail URL from public bucket
  const publicBase = c.env.R2_PUBLIC_URL || `${new URL(c.req.url).origin}/public`;
  const data = generations.map((g) => ({
    ...g,
    eventThumbnail: `${publicBase}/events/${g.eventId}/thumbnail.webp?t=${Date.now()}`,
  }));

  return c.json({ success: true, data, total, page, pageSize });
});

generationRouter.get('/:id', async (c) => {
  const db = new D1Helper(c.env.DB);
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';
  const workerUrl = new URL(c.req.url).origin;
  const user = c.get('user');
  const dbUser = await db.getUserByEmail(user.email);
  const userId = dbUser?.id || user.id;

  const gen = await db.getGenerationById(c.req.param('id'));
  if (!gen) {
    return c.json({ success: false, error: 'Generation not found' }, 404);
  }

  // Only the creator can view
  if (gen.userId !== userId) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  // If URL starts with http, return directly (Agnes-hosted); otherwise sign (R2 key)
  const resolveUrl = (value?: string) =>
    value ? (value.startsWith('http') ? value : generateSignedUrl(value, secret, workerUrl)) : undefined;

  const [inputImageUrl, imageUrl, videoUrl] = await Promise.all([
    gen.inputImage && gen.inputImage !== 'base64-direct' ? resolveUrl(gen.inputImage) : undefined,
    resolveUrl(gen.outputImage),
    resolveUrl(gen.outputVideo),
  ]);

  let parsedCaptions: string[] = [];
  try { parsedCaptions = gen.captions ? JSON.parse(gen.captions) : []; } catch {}

  const publicBase = c.env.R2_PUBLIC_URL || `${new URL(c.req.url).origin}/public`;
  const refVideo = `${publicBase}/events/${gen.eventId}/reference.mp4`;

  return c.json({
    success: true,
    data: {
      ...gen,
      inputImageUrl,
      outputImageUrl: imageUrl,
      outputVideoUrl: videoUrl || (gen.status === 'failed' ? refVideo : undefined),
      eventThumbnail: `${publicBase}/events/${gen.eventId}/thumbnail.webp?t=${Date.now()}`,
      captions: parsedCaptions,
    },
  });
});

export default generationRouter;
