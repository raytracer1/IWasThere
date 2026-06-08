import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { generateSignedUrl } from '../utils/r2';
import type { Bindings } from '../types';

const historyRouter = new Hono<{ Bindings: Bindings }>();

/**
 * GET /history — Get user's generation history.
 * Query params: page, pageSize
 * Includes event info (title, category, thumbnail) for display.
 */
historyRouter.get('/', async (c) => {
  const user = c.get('user');
  const db = new D1Helper(c.env.DB);
  const baseUrl = new URL(c.req.url).origin;
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';

  const page = parseInt(c.req.query('page') ?? '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') ?? '20', 10);

  const { jobs, total } = await db.getUserJobs(user.id, page, pageSize);

  // Enrich with event info and signed URLs
  const enrichedJobs = await Promise.all(
    jobs.map(async (job) => {
      const event = await db.getEventById(job.eventId);
      return {
        ...job,
        inputImageUrl: await generateSignedUrl(job.inputImage, secret, baseUrl),
        outputVideoUrl: job.outputVideo
          ? job.outputVideo.startsWith('http')
            ? job.outputVideo
            : await generateSignedUrl(job.outputVideo, secret, baseUrl)
          : undefined,
        eventTitle: event?.title ?? 'Unknown Event',
        eventCategory: event?.category ?? 'other',
        eventThumbnail: event?.thumbnailUrl
          ? await generateSignedUrl(event.thumbnailUrl, secret, baseUrl)
          : undefined,
      };
    })
  );

  return c.json({
    success: true,
    data: enrichedJobs,
    total,
    page,
    pageSize,
  });
});

export default historyRouter;
