import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { generateSignedUrl } from '../utils/r2';
import type { Bindings } from '../types';

const generationRouter = new Hono<{ Bindings: Bindings }>();

/**
 * GET /generation/:id — Poll generation status (no auth required).
 * The generation ID itself acts as the access key.
 */
generationRouter.get('/:id', async (c) => {
  const db = new D1Helper(c.env.DB);
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';
  const workerUrl = new URL(c.req.url).origin;

  const gen = await db.getGenerationById(c.req.param('id'));
  if (!gen) {
    return c.json({ success: false, error: 'Generation not found' }, 404);
  }

  const inputImageUrl = await generateSignedUrl(gen.inputImage, secret, workerUrl);
  const outputImageUrl = gen.outputImage
    ? await generateSignedUrl(gen.outputImage, secret, workerUrl)
    : undefined;

  let parsedCaptions: string[] = [];
  try {
    parsedCaptions = gen.captions ? JSON.parse(gen.captions) : [];
  } catch { /* keep empty */ }

  return c.json({
    success: true,
    data: {
      ...gen,
      inputImageUrl,
      outputImageUrl,
      captions: parsedCaptions,
    },
  });
});

export default generationRouter;
