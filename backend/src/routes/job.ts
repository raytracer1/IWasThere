import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import { pollSwapStatus } from '../utils/fal';
import { generateSignedUrl } from '../utils/r2';
import type { Bindings } from '../types';

const jobRouter = new Hono<{ Bindings: Bindings }>();

/**
 * GET /job/:id — Get job status.
 * If job is still queued/processing, polls fal.ai for the latest status.
 * Returns the job with a signed output URL if completed.
 */
jobRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const db = new D1Helper(c.env.DB);
  const falApiKey = c.env.FAL_API_KEY;
  const baseUrl = new URL(c.req.url).origin;
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';

  const jobId = c.req.param('id');
  const job = await db.getJobById(jobId);

  if (!job) {
    return c.json({ success: false, error: 'Job not found' }, 404);
  }

  // Verify ownership
  if (job.userId !== user.id && user.role !== 'admin') {
    return c.json({ success: false, error: 'Not authorized to view this job' }, 403);
  }

  // If still in progress, poll fal.ai for update
  console.log(`Poll check: status=${job.status}, falRequestId=${job.falRequestId}, hasApiKey=${!!falApiKey}`);
  if ((job.status === 'queued' || job.status === 'processing') && job.falRequestId && falApiKey) {
    try {
      const falStatus = await pollSwapStatus(falApiKey, job.falRequestId);
      console.log(`Poll job ${jobId}: fal status=${JSON.stringify(falStatus)}`);

      if (falStatus.status === 'COMPLETED') {
        const outputVideoUrl = falStatus.videoUrl || (falStatus as { video?: { url: string } }).video?.url;
        if (outputVideoUrl) {
          await db.updateJobStatus(jobId, 'completed', outputVideoUrl);
          job.status = 'completed';
          job.outputVideo = outputVideoUrl;
          job.completedAt = Math.floor(Date.now() / 1000);
        } else {
          await db.updateJobStatus(jobId, 'failed', undefined, 'No output video returned');
          job.status = 'failed';
          job.errorMessage = 'No output video returned';
        }
      } else if (falStatus.status === 'FAILED') {
        const errMsg = falStatus.error ?? 'AI generation failed';
        await db.updateJobStatus(jobId, 'failed', undefined, errMsg);
        job.status = 'failed';
        job.errorMessage = errMsg;
      }
    } catch (err) {
      console.error('fal.ai poll error:', err);
    }
  } else if (job.status === 'processing' && !job.falRequestId) {
    // Stuck job: was updated to processing but fal_request_id was lost (D1 error)
    const age = Date.now() / 1000 - job.createdAt;
    if (age > 600) { // 10 minutes
      await db.updateJobStatus(jobId, 'failed', undefined, 'Job stuck without fal request ID. Please try again.');
      job.status = 'failed';
      job.errorMessage = 'Job stuck without fal request ID. Please try again.';
    }
  }

  // Get event info for richer response
  const event = await db.getEventById(job.eventId);

  const { outputVideo: _outputVideo, ...jobWithoutOutput } = job;

  return c.json({
    success: true,
    data: {
      ...jobWithoutOutput,
      outputVideoUrl: _outputVideo
        ? _outputVideo.startsWith('http')
          ? _outputVideo // fal.ai direct URL
          : await generateSignedUrl(_outputVideo, secret, baseUrl) // R2 key
        : undefined,
      inputImageUrl: await generateSignedUrl(job.inputImage, secret, baseUrl),
      event: event
        ? {
            id: event.id,
            title: event.title,
            category: event.category,
            trimRanges: event.trimRanges,
            originalVideoUrl:
              await (async () => {
                const candidates = ['mp4', 'webm'];
                for (const ext of candidates) {
                  const key = `hot-events/${event.id}/original.${ext}`;
                  const obj = await c.env.ASSETS.head(key);
                  if (obj) return generateSignedUrl(key, secret, baseUrl);
                }
                return event.videoUrl ? generateSignedUrl(event.videoUrl, secret, baseUrl) : undefined;
              })(),
            thumbnailUrl: event.thumbnailUrl
              ? await generateSignedUrl(event.thumbnailUrl, secret, baseUrl)
              : undefined,
          }
        : undefined,
    },
  });
});

export default jobRouter;
