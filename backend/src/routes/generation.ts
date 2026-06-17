import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { generateSignedUrl } from '../utils/r2';
import { pollVideo } from '../utils/agnes';
import type { Bindings } from '../types';

const generationRouter = new Hono<{ Bindings: Bindings }>();

/** GET / — List user's generations */
generationRouter.get('/', async (c) => {
  const db = new D1Helper(c.env.DB);
  const user = c.get('user');
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') ?? '20', 10);
  const { generations, total } = await db.getUserGenerations(user.id, page, pageSize);

  // Build full thumbnail URL from public bucket
  const publicBase = c.env.R2_PUBLIC_URL || `${new URL(c.req.url).origin}/public`;
  const data = generations.map((g) => ({
    ...g,
    eventThumbnail: g.eventThumbnail
      ? (g.eventThumbnail.startsWith('http') ? g.eventThumbnail : `${publicBase}/${g.eventThumbnail}`)
      : undefined,
  }));

  return c.json({ success: true, data, total, page, pageSize });
});

generationRouter.get('/:id', async (c) => {
  const db = new D1Helper(c.env.DB);
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';
  const workerUrl = new URL(c.req.url).origin;
  const apiKey = c.env.AGNES_API_KEY;
  const user = c.get('user');

  const gen = await db.getGenerationById(c.req.param('id'));
  if (!gen) {
    return c.json({ success: false, error: 'Generation not found' }, 404);
  }

  // Only the creator can view
  if (gen.userId !== user.id) {
    return c.json({ success: false, error: 'Not authorized' }, 403);
  }

  // Poll video status if still processing
  if (gen.status === 'processing' && gen.agnesJobId && apiKey) {
    console.log(`[gen] Polling Agnes task=${gen.agnesJobId}`);
    try {
      const videoUrl = await pollVideo(gen.agnesJobId, apiKey);
      console.log(`[gen] Poll result: ${videoUrl ? 'DONE' : 'still processing'}`);
      if (videoUrl) {
        await db.updateGeneration(gen.id, { outputVideo: videoUrl, status: 'completed' });
        gen.status = 'completed';
        gen.outputVideo = videoUrl;
      }
    } catch (err) {
      console.error('[gen] Agnes failed:', err);
      await db.updateGenerationStatus(gen.id, 'failed', undefined, err instanceof Error ? err.message : 'Unknown error');
      gen.status = 'failed';
      gen.errorMessage = err instanceof Error ? err.message : 'Unknown error';
    }
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

  return c.json({
    success: true,
    data: {
      ...gen,
      inputImageUrl,
      outputImageUrl: imageUrl,
      outputVideoUrl: videoUrl,
      captions: parsedCaptions,
    },
  });
});

export default generationRouter;
