import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { submitSwapJob } from '../utils/fal';
import { generateSignedUrl } from '../utils/r2';
import { rateLimitMiddleware } from '../middleware/rate-limit';
import { DAILY_GENERATION_LIMIT, DEFAULT_RESOLUTION } from '../shared';
import type { SwapRequest } from '../shared';
import type { Bindings } from '../types';

const swapRouter = new Hono<{ Bindings: Bindings }>();

// Apply rate limiting middleware
swapRouter.use('*', rateLimitMiddleware());

/**
 * POST /swap — Trigger a fal.ai swap job.
 * Body: { eventId: string, imageKey: string, resolution?: string }
 */
swapRouter.post('/', async (c) => {
  const user = c.get('user');
  const db = new D1Helper(c.env.DB);
  const baseUrl = new URL(c.req.url).origin;
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';
  const falApiKey = c.env.FAL_API_KEY;

  if (!falApiKey) {
    return c.json({ success: false, error: 'AI service not configured' }, 500);
  }

  // Parse request body
  let body: SwapRequest;
  try {
    body = await c.req.json<SwapRequest>();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  if (!body.eventId || !body.imageKey) {
    return c.json({ success: false, error: 'eventId and imageKey are required' }, 400);
  }

  // Check rate limit
  const todayCount = await db.getTodayGenerationCount(user.id);
  if (todayCount >= DAILY_GENERATION_LIMIT) {
    return c.json({
      success: false,
      error: `Daily generation limit reached (${DAILY_GENERATION_LIMIT}/day). Please try again tomorrow.`,
    }, 429);
  }

  // Get event
  const event = await db.getEventById(body.eventId);
  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  // Generate signed URLs for fal.ai
  let videoSignedUrl: string;
  let imageSignedUrl: string;
  try {
    videoSignedUrl = await generateSignedUrl(event.videoUrl, secret, baseUrl);
    imageSignedUrl = await generateSignedUrl(body.imageKey, secret, baseUrl);
  } catch (err) {
    console.error('Signed URL generation error:', err);
    return c.json({ success: false, error: 'Failed to generate access URLs' }, 500);
  }

  // Create job record
  const jobId = crypto.randomUUID();

  await db.createJob({
    id: jobId,
    userId: user.id,
    eventId: body.eventId,
    inputImage: body.imageKey,
    status: 'queued',
  });

  // Check if user has enough credits
  const eventPrice = event.price ?? 0.50;
  const freshUser = await db.getUserById(user.id);
  if (freshUser && freshUser.credits < eventPrice) {
    return c.json({ success: false, error: `Insufficient credits. Need ${eventPrice} 💎, you have ${freshUser.credits} 💎.` }, 402);
  }

  // Parse trimRanges for keyframe_id (in frame)
  let keyframeId = 1;
  if (event.trimRanges) {
    try {
      const ranges = JSON.parse(event.trimRanges) as { startFrame: number; endFrame: number }[];
      if (ranges.length > 0) {
        keyframeId = ranges[0].startFrame;
      }
    } catch { /* keep default */ }
  }
  const seed = Math.floor(Math.random() * 2147483647);

  // Submit to fal.ai
  let falRequestId: string;
  try {
    falRequestId = await submitSwapJob(
      falApiKey,
      videoSignedUrl,
      imageSignedUrl,
      keyframeId,
      seed,
      body.resolution ?? DEFAULT_RESOLUTION
    );
  } catch (err) {
    console.error('fal.ai submit error:', err);
    await db.updateJobStatus(jobId, 'failed', undefined, 'Failed to submit AI job');
    return c.json({ success: false, error: 'Failed to start AI generation. Please try again.' }, 500);
  }

  // Update job with fal request ID and set to processing
  await db.updateJobFalRequestId(jobId, falRequestId);

  // Deduct credits based on event price
  await db.deductCredits(user.id, eventPrice);

  // Increment rate limit counter
  await db.incrementGenerationCount(user.id);

  return c.json({
    success: true,
    data: {
      jobId,
      falRequestId,
      status: 'processing',
    },
  });
});

export default swapRouter;
