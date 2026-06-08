import { Hono } from 'hono';
import { uploadToR2, generateFileKey } from '../utils/r2';
import { MAX_SELFIE_SIZE, ACCEPTED_IMAGE_TYPES } from '@hotinsert/shared';
import type { Bindings } from '../types';

const uploadRouter = new Hono<{ Bindings: Bindings }>();

// Duck-typed file interface for Workers runtime (no File class in @cloudflare/workers-types)
interface UploadedFile {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * POST /upload — Upload user selfie image to R2.
 */
uploadRouter.post('/', async (c) => {
  const user = c.get('user');

  const formData = await c.req.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string') {
    return c.json({ success: false, error: 'No file provided. Use "file" field in form data.' }, 400);
  }

  const uploadFile = file as unknown as UploadedFile;

  // Validate file size
  if (uploadFile.size > MAX_SELFIE_SIZE) {
    return c.json({
      success: false,
      error: `File too large. Maximum size is ${MAX_SELFIE_SIZE / (1024 * 1024)}MB.`,
    }, 400);
  }

  // Validate file type
  if (!ACCEPTED_IMAGE_TYPES.includes(uploadFile.type as typeof ACCEPTED_IMAGE_TYPES[number])) {
    return c.json({
      success: false,
      error: `Invalid file type. Accepted: ${ACCEPTED_IMAGE_TYPES.join(', ')}.`,
    }, 400);
  }

  // Generate unique R2 key
  const key = generateFileKey(user.id, 'uploads', uploadFile.name);
  const buffer = await uploadFile.arrayBuffer();

  // Upload to R2
  try {
    await uploadToR2(c.env.ASSETS, key, buffer, uploadFile.type);
  } catch (err) {
    console.error('R2 upload error:', err);
    return c.json({ success: false, error: 'Failed to upload file. Please try again.' }, 500);
  }

  return c.json({
    success: true,
    data: {
      key,
      filename: uploadFile.name,
      size: uploadFile.size,
      contentType: uploadFile.type,
    },
  });
});

export default uploadRouter;
