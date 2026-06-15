import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { compileEventPrompts } from '../utils/promptBuilder';
import { generateImage, submitVideo } from '../utils/agnes';
import type { Bindings } from '../types';

const generateRouter = new Hono<{ Bindings: Bindings }>();

generateRouter.post('/', async (c) => {
  const db = new D1Helper(c.env.DB);
  const apiKey = c.env.AGNES_API_KEY;

  if (!apiKey) {
    return c.json({ success: false, error: 'Agnes AI not configured' }, 500);
  }

  const body = await c.req.json<{ eventId: string; imageBase64: string }>();
  const { eventId, imageBase64 } = body;

  if (!eventId || !imageBase64) {
    return c.json({ success: false, error: 'eventId and imageBase64 are required' }, 400);
  }

  const selfieBase64 = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const event = await db.getEventById(eventId);
  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  const { imagePrompt } = compileEventPrompts(event);
  const generationId = crypto.randomUUID();

  await db.createGeneration({
    id: generationId,
    userId: 'anonymous',
    eventId,
    inputImage: 'base64-direct',
    status: 'processing',
  });

  console.log(`[generate] Step 1: Image for ${generationId}`);

  try {
    // Step 1: Image generation (base64 → reliable)
    const generatedImageUrl = await generateImage(imagePrompt, selfieBase64, apiKey, '576x1024');
    console.log(`[generate] Image done: ${generatedImageUrl}`);

    // Step 2: Submit video (Agnes-hosted URL → won't be blocked)
    console.log(`[generate] Step 2: Video`);
    const taskId = await submitVideo(imagePrompt, generatedImageUrl, apiKey, 121, 24);
    console.log(`[generate] Video task: ${taskId}`);

    await db.updateGeneration(generationId, { agnesJobId: taskId });

    return c.json({
      success: true,
      data: { generationId, status: 'processing' },
    });
  } catch (err) {
    console.error(`[generate] Failed:`, err);
    await db.updateGenerationStatus(generationId, 'failed', undefined, err instanceof Error ? err.message : 'Unknown error');
    return c.json({ success: false, error: err instanceof Error ? err.message : 'Generation failed' }, 500);
  }
});

export default generateRouter;
