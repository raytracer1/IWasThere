import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { generateSignedUrl, uploadToR2 } from '../utils/r2';
import { compileEventPrompts } from '../utils/promptBuilder';
import { generateImage } from '../utils/agnes';
import type { Bindings } from '../types';

const generateRouter = new Hono<{ Bindings: Bindings }>();

/**
 * POST /generate — Trigger AI image generation.
 * Body: { eventId, imageKey }
 *
 * Pipeline:
 * 1. Load event, compile prompt
 * 2. Sign selfie URL for Agnes AI
 * 3. Call Agnes AI (async — create record, call API, update on completion)
 * 4. Download generated image, upload to R2
 * 5. Generate captions, update generation record
 */
generateRouter.post('/', async (c) => {
  const user = c.get('user');
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

  // Load event
  const event = await db.getEventById(eventId);
  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  // Compile prompts
  const { imagePrompt, captions } = compileEventPrompts(event);

  // Sign selfie URL for Agnes AI
  const selfieUrl = await generateSignedUrl(imageKey, secret, workerUrl);

  // Create generation record
  const generationId = crypto.randomUUID();
  await db.createGeneration({
    id: generationId,
    userId: user.id,
    eventId,
    inputImage: imageKey,
    status: 'processing',
  });

  // Fire-and-forget: call Agnes AI, then update the record
  // Using waitUntil to keep the worker alive for the async work
  c.executionCtx?.waitUntil(
    (async () => {
      try {
        // Call Agnes AI
        const imageUrl = await generateImage(imagePrompt, selfieUrl, apiKey, '1024x768');

        // Download generated image
        const imageResp = await fetch(imageUrl);
        if (!imageResp.ok) {
          throw new Error(`Failed to download generated image: ${imageResp.status}`);
        }
        const imageBuffer = await imageResp.arrayBuffer();

        // Upload to R2
        const outputKey = `outputs/${generationId}.png`;
        await uploadToR2(c.env.ASSETS, outputKey, imageBuffer, 'image/png');

        // Update generation record
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
