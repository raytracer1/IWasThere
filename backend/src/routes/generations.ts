import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { generateSignedUrl } from '../utils/r2';
import { DEFAULT_PAGE_SIZE } from '../shared';
import type { Bindings } from '../types';

const generationsRouter = new Hono<{ Bindings: Bindings }>();

/**
 * GET /generations — User's generation history.
 * Query: ?page=, ?pageSize=
 */
generationsRouter.get('/', async (c) => {
  const user = c.get('user');
  const db = new D1Helper(c.env.DB);
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';
  const workerUrl = new URL(c.req.url).origin;
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10);

  const { generations, total } = await db.getUserGenerations(user.id, page, pageSize);

  // Sign image URLs
  const signed = await Promise.all(
    generations.map(async (gen) => {
      const result: Record<string, unknown> = { ...gen };
      result.inputImageUrl = await generateSignedUrl(gen.inputImage, secret, workerUrl);
      if (gen.outputImage) {
        result.outputImageUrl = await generateSignedUrl(gen.outputImage, secret, workerUrl);
      }
      return result;
    })
  );

  return c.json({
    success: true,
    data: signed,
    total,
    page,
    pageSize,
  });
});

export default generationsRouter;
