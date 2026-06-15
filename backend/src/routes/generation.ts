import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { generateSignedUrl, uploadToR2, deleteFromR2 } from '../utils/r2';
import { pollVideo } from '../utils/agnes';
import type { Bindings } from '../types';

const generationRouter = new Hono<{ Bindings: Bindings }>();

generationRouter.get('/:id', async (c) => {
  const db = new D1Helper(c.env.DB);
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';
  const workerUrl = new URL(c.req.url).origin;
  const apiKey = c.env.AGNES_API_KEY;

  const gen = await db.getGenerationById(c.req.param('id'));
  if (!gen) {
    return c.json({ success: false, error: 'Generation not found' }, 404);
  }

  // Poll video status if still processing
  if (gen.status === 'processing' && gen.agnesJobId && apiKey) {
    console.log(`[gen] Polling Agnes task=${gen.agnesJobId}`);
    try {
      const videoUrl = await pollVideo(gen.agnesJobId, apiKey);
      console.log(`[gen] Poll result: ${videoUrl ? 'DONE' : 'still processing'}`);
      if (videoUrl) {
        try {
          const videoResp = await fetch(videoUrl);
          if (videoResp.ok) {
            const buffer = await videoResp.arrayBuffer();
            const outputKey = `outputs/${gen.id}.mp4`;
            await uploadToR2(c.env.ASSETS, outputKey, buffer, 'video/mp4');
            await db.updateGenerationStatus(gen.id, 'completed', outputKey, undefined, undefined);
            gen.status = 'completed';
            gen.outputImage = outputKey;
            // Delete input selfie
            try { await deleteFromR2(c.env.ASSETS, gen.inputImage); } catch {}
          }
        } catch (err) {
          console.error('[gen] Download error:', err);
        }
      }
    } catch (err) {
      console.error('[gen] Agnes failed:', err);
      await db.updateGenerationStatus(gen.id, 'failed', undefined, err instanceof Error ? err.message : 'Unknown error');
      gen.status = 'failed';
      gen.errorMessage = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  const inputImageUrl = await generateSignedUrl(gen.inputImage, secret, workerUrl);
  const outputUrl = gen.outputImage
    ? await generateSignedUrl(gen.outputImage, secret, workerUrl)
    : undefined;

  let parsedCaptions: string[] = [];
  try { parsedCaptions = gen.captions ? JSON.parse(gen.captions) : []; } catch {}

  return c.json({
    success: true,
    data: {
      ...gen,
      inputImageUrl,
      outputImageUrl: outputUrl,
      outputVideoUrl: gen.status === 'completed' ? outputUrl : undefined,
      captions: parsedCaptions,
    },
  });
});

export default generationRouter;
