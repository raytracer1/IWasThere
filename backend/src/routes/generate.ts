import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { generateSignedUrl, uploadToR2 } from '../utils/r2';
import { compileEventPrompts } from '../utils/promptBuilder';
import { generateImage } from '../utils/agnes';
import type { Bindings } from '../types';

const generateRouter = new Hono<{ Bindings: Bindings }>();

/**
 * POST /generate — Trigger AI image generation (no auth required).
 * Body: { eventId, imageKey }
 */
generateRouter.post('/', async (c) => {
  const db = new D1Helper(c.env.DB);
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';
  const workerUrl = new URL(c.req.url).origin;
  const apiKey = c.env.AGNES_API_KEY;

  if (!apiKey) {
    return c.json({ success: false, error: 'Agnes AI not configured' }, 500);
  }

  const body = await c.req.json<{ eventId: string; imageKey: string }>();
  const { eventId, imageKey } = body;

  if (!eventId || !imageKey) {
    return c.json({ success: false, error: 'eventId and imageKey are required' }, 400);
  }

  const event = await db.getEventById(eventId);
  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  const { imagePrompt, captions } = compileEventPrompts(event);
  const selfieUrl = await generateSignedUrl(imageKey, secret, workerUrl);

  const generationId = crypto.randomUUID();
  await db.createGeneration({
    id: generationId,
    userId: 'anonymous',
    eventId,
    inputImage: imageKey,
    status: 'processing',
  });

  c.executionCtx?.waitUntil(
    (async () => {
      try {
        const imageUrl = await generateImage(imagePrompt, selfieUrl, apiKey, '1024x768');
        const imageResp = await fetch(imageUrl);
        if (!imageResp.ok) {
          throw new Error(`Failed to download generated image: ${imageResp.status}`);
        }
        const imageBuffer = await imageResp.arrayBuffer();

        const outputKey = `outputs/${generationId}.png`;
        await uploadToR2(c.env.ASSETS, outputKey, imageBuffer, 'image/png');

        await db.updateGenerationStatus(
          generationId,
          'completed',
          outputKey,
          undefined,
          JSON.stringify(captions)
        );
      } catch (err) {
        console.error('Generation error:', err);
        await db.updateGenerationStatus(
          generationId,
          'failed',
          undefined,
          err instanceof Error ? err.message : 'Unknown error'
        );
      }
    })()
  );

  return c.json({
    success: true,
    data: {
      generationId,
      status: 'processing',
    },
  });
});

export default generateRouter;
