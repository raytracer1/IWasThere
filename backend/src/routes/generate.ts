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

  const body = await c.req.json<{ eventId: string; imageBase64: string; aspectRatio?: string; football?: Record<string, unknown>; basketball?: Record<string, unknown> }>();
  const { eventId, imageBase64, football, basketball } = body;

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
  const price = event.price ?? 0;
  if (price > 0 && (dbUser?.credits ?? 0) < price) {
    return c.json({ success: false, error: `Insufficient credits. Need ${price}, have ${dbUser?.credits ?? 0}.` }, 402);
  }

  const userId = dbUser?.id || user.id;

  const { imagePrompt, videoPrompt } = compileEventPrompts(event, (football || basketball) as never);
  const generationId = crypto.randomUUID();

  await db.createGeneration({
    id: generationId,
    userId,
    eventId,
    inputImage: 'base64-direct',
    status: 'processing',
    football: football ? JSON.stringify(football) : undefined,
    basketball: basketball ? JSON.stringify(basketball) : undefined,
  });

  const MAX_RETRIES = 3;
  const size = aspectToSize(body.aspectRatio || event.aspectRatio);
  const [w, h] = size.split('x').map(Number);
  let generatedImageUrl: string | null = null;
  let retries = 0;

  // ─── Step 1: Generate image (with retry) ────────────────
  while (retries < MAX_RETRIES) {
    try {
      console.log(`[generate] Step 1: Image attempt ${retries + 1}/${MAX_RETRIES} for ${generationId}`);
      generatedImageUrl = await generateImage(imagePrompt, selfieBase64, apiKey, size);
      console.log(`[generate] Image done: ${generatedImageUrl}`);
      await db.updateGeneration(generationId, { outputImage: generatedImageUrl });
      break;
    } catch (err) {
      retries++;
      console.error(`[generate] Image attempt ${retries} failed:`, String(err));
      if (retries >= MAX_RETRIES) {
        await db.updateGeneration(generationId, { status: 'failed', retryImage: retries, errorMessage: String(err) });
        return c.json({ success: true, data: { generationId, status: 'failed' } }, 200);
      }
      await db.updateGeneration(generationId, { retryImage: retries });
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // ─── Step 2: Submit video (with retry) ──────────────────
  retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      console.log(`[generate] Step 2: Video attempt ${retries + 1}/${MAX_RETRIES}`);
      const duration = Math.round(event.duration || 5);
      const numFrames = Math.ceil(duration * 24 / 8) * 8 + 1;
      const taskId = await submitVideo(videoPrompt, generatedImageUrl!, apiKey, numFrames, 24, w, h, event.generation?.negative_prompt);
      console.log(`[generate] Video task: ${taskId}`);
      await db.updateGeneration(generationId, { agnesJobId: taskId });
      return c.json({ success: true, data: { generationId, status: 'processing' } });
    } catch (err) {
      retries++;
      console.error(`[generate] Video attempt ${retries} failed:`, String(err));
      if (retries >= MAX_RETRIES) {
        await db.updateGeneration(generationId, { status: 'failed', retryVideo: retries, errorMessage: String(err) });
        return c.json({ success: true, data: { generationId, status: 'failed' } }, 200);
      }
      await db.updateGeneration(generationId, { retryVideo: retries });
      await new Promise(r => setTimeout(r, 2000));
    }
  }
});

export default generateRouter;
