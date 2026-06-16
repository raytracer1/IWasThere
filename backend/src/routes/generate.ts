import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { compileEventPrompts } from '../utils/promptBuilder';
import { submitVideo } from '../utils/agnes';
import type { Bindings } from '../types';

const generateRouter = new Hono<{ Bindings: Bindings }>();

async function uploadToCloudinary(base64: string, cloudName: string, preset: string): Promise<{ url: string; publicId: string; deleteToken: string }> {
  const formData = new FormData();
  formData.append('file', base64);
  formData.append('upload_preset', preset);

  const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Cloudinary upload failed: ${errText.slice(0, 200)}`);
  }

  const json = await resp.json() as { secure_url: string; public_id: string; delete_token: string };
  return { url: json.secure_url, publicId: json.public_id, deleteToken: json.delete_token };
}

generateRouter.post('/', async (c) => {
  const db = new D1Helper(c.env.DB);
  const apiKey = c.env.AGNES_API_KEY;
  const cloudName = c.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = c.env.CLOUDINARY_UPLOAD_PRESET;

  if (!apiKey) {
    return c.json({ success: false, error: 'Agnes AI not configured' }, 500);
  }
  if (!cloudName || !uploadPreset) {
    return c.json({ success: false, error: 'Cloudinary not configured' }, 500);
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
    inputImage: 'cloudinary',
    status: 'processing',
  });

  console.log(`[generate] Uploading selfie to Cloudinary...`);

  try {
    // Step 1: Upload selfie to Cloudinary → public URL
    const photo = await uploadToCloudinary(selfieBase64, cloudName, uploadPreset);
    console.log(`[generate] Photo: ${photo.url}`);

    // Step 2: Submit video generation with Cloudinary URL
    console.log(`[generate] Submitting video...`);
    const taskId = await submitVideo(imagePrompt, photo.url, apiKey, 121, 24);
    console.log(`[generate] Video task: ${taskId}`);

    await db.updateGeneration(generationId, {
      agnesJobId: taskId,
      inputImage: `${photo.publicId}::${photo.deleteToken}`,
    });

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
