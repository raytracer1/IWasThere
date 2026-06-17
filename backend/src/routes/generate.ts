import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { compileEventPrompts } from '../utils/promptBuilder';
import { generateImage, submitVideo } from '../utils/agnes';
import type { Bindings } from '../types';

const ASPECT_SIZES: Record<string, string> = {
  '9:16': '720x1280',   // 720p portrait
  '16:9': '1280x720',   // 720p landscape
  '1:1': '720x720',     // 720p square
  '4:3': '960x720',
  '3:4': '720x960',
};

function aspectToSize(aspectRatio?: string): string {
  return ASPECT_SIZES[aspectRatio ?? ''] || '1280x720';
}

const generateRouter = new Hono<{ Bindings: Bindings }>();

generateRouter.post('/', async (c) => {
  const db = new D1Helper(c.env.DB);
  const apiKey = c.env.AGNES_API_KEY;

  if (!apiKey) {
    return c.json({ success: false, error: 'Agnes AI not configured' }, 500);
  }

  const body = await c.req.json<{ eventId: string; imageBase64: string; football?: { teamA: string; teamB: string; score: string; mood: string } }>();
  const { eventId, imageBase64, football } = body;

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

  // ─── Credit check ──────────────────────────────────────
  const user = c.get('user');
  const dbUser = await db.getUserByEmail(user.email);
  const credits = dbUser?.credits ?? 0;
  const price = event.price ?? 0;
  if (price > 0 && credits < price) {
    return c.json({ success: false, error: `Insufficient credits. Need ${price}, have ${credits}.` }, 402);
  }

  const { imagePrompt } = compileEventPrompts(event, football);
  const generationId = crypto.randomUUID();

  await db.createGeneration({
    id: generationId,
    userId: user.id,
    eventId,
    inputImage: 'base64-direct',
    status: 'processing',
    football: football ? JSON.stringify(football) : undefined,
  });

  console.log(`[generate] Step 1: Image for ${generationId}`);

  try {
    // Step 1: Generate image with Agnes (base64 → image URL on Agnes servers)
    const size = aspectToSize(event.aspectRatio);
    const generatedImageUrl = await generateImage(imagePrompt, selfieBase64, apiKey, size, event.generation?.negative_prompt);
    console.log(`[generate] Image done: ${generatedImageUrl}`);

    // Store the image URL directly
    await db.updateGeneration(generationId, { outputImage: generatedImageUrl });

    // Step 2: Submit video with the Agnes-hosted image URL
    console.log(`[generate] Step 2: Video`);
    const [w, h] = size.split('x').map(Number);
    const taskId = await submitVideo(imagePrompt, generatedImageUrl, apiKey, 121, 24, w, h, event.generation?.negative_prompt);
    console.log(`[generate] Video task: ${taskId}`);

    await db.updateGeneration(generationId, { agnesJobId: taskId });

    return c.json({
      success: true,
      data: { generationId, status: 'processing' },
    });
  } catch (err) {
    console.error(`[generate] Failed:`, err);
    try { await db.updateGenerationStatus(generationId, 'failed', undefined, err instanceof Error ? err.message : 'Unknown error'); } catch {}
    return c.json({ success: false, error: err instanceof Error ? err.message : 'Generation failed' }, 500);
  }
});

export default generateRouter;
