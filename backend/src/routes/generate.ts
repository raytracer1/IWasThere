import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { generateSignedUrl, uploadToR2 } from '../utils/r2';
import { compileEventPrompts } from '../utils/promptBuilder';
import { generateImage } from '../utils/agnes';
import type { Bindings } from '../types';

const generateRouter = new Hono<{ Bindings: Bindings }>();

generateRouter.post('/', async (c) => {
  const db = new D1Helper(c.env.DB);
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';
  const workerUrl = new URL(c.req.url).origin;
  const apiKey = c.env.AGNES_API_KEY;

  if (!apiKey) {
    return c.json({ success: false, error: 'Agnes AI not configured' }, 500);
  }

  const body = await c.req.json<{ eventId: string; imageBase64: string }>();
  const { eventId, imageBase64 } = body;

  if (!eventId || !imageBase64) {
    return c.json({ success: false, error: 'eventId and imageBase64 are required' }, 400);
  }

  // Ensure base64 has data URL prefix
  const dataUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const event = await db.getEventById(eventId);
  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  const { imagePrompt, captions } = compileEventPrompts(event);
  const generationId = crypto.randomUUID();

  await db.createGeneration({
    id: generationId,
    userId: 'anonymous',
    eventId,
    inputImage: 'base64-direct',
    status: 'processing',
  });

  console.log(`[generate] Starting ${generationId} for ${eventId}`);
  console.log(`[generate] Base64 size: ${imageBase64.length} chars`);

  try {
    console.log('[generate] Calling Agnes AI (img2img)...');
    const imageUrl = await generateImage(imagePrompt, dataUrl, apiKey, '576x1024');
    console.log(`[generate] Image URL: ${imageUrl}`);

    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) {
      throw new Error(`Download failed: ${imageResp.status}`);
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

    const outputUrl = await generateSignedUrl(outputKey, secret, workerUrl);

    console.log(`[generate] Completed ${generationId}`);

    return c.json({
      success: true,
      data: {
        generationId,
        status: 'completed',
        outputImageUrl: outputUrl,
        captions,
      },
    });
  } catch (err) {
    console.error(`[generate] Failed:`, err);
    await db.updateGenerationStatus(
      generationId,
      'failed',
      undefined,
      err instanceof Error ? err.message : 'Unknown error'
    );
    return c.json({
      success: false,
      error: err instanceof Error ? err.message : 'Generation failed',
    }, 500);
  }
});

export default generateRouter;
