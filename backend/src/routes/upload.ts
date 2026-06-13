import { Hono } from 'hono';
import { uploadToR2 } from '../utils/r2';
import { MAX_SELFIE_SIZE, ACCEPTED_IMAGE_TYPES } from '../shared';
import type { Bindings } from '../types';

const uploadRouter = new Hono<{ Bindings: Bindings }>();

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * POST /upload — Upload user selfie image to R2.
 * No auth required. Uses anonymous folder.
 */
uploadRouter.post('/', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file');

  if (!file || typeof file === 'string') {
    return c.json({ success: false, error: 'No file provided. Use "file" field in form data.' }, 400);
  }

  const uploadFile = file as unknown as UploadedFile;

  if (uploadFile.size > MAX_SELFIE_SIZE) {
    return c.json({
      success: false,
      error: `File too large. Maximum size is ${MAX_SELFIE_SIZE / (1024 * 1024)}MB.`,
    }, 400);
  }

  if (!ACCEPTED_IMAGE_TYPES.includes(uploadFile.type as typeof ACCEPTED_IMAGE_TYPES[number])) {
    return c.json({
      success: false,
      error: `Invalid file type. Accepted: ${ACCEPTED_IMAGE_TYPES.join(', ')}.`,
    }, 400);
  }

  const ext = uploadFile.name.split('.').pop() || 'jpg';
  const key = `uploads/${crypto.randomUUID()}.${ext}`;
  const buffer = await uploadFile.arrayBuffer();

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
