import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware, requireAdmin } from './middleware/auth';
import eventsRouter from './routes/events';
import authRouter from './routes/auth';
import meRouter from './routes/me';
import generateRouter from './routes/generate';
import generationRouter from './routes/generation';
import adminRouter from './routes/admin';
import { verifySignedToken } from './utils/r2';
import type { Bindings } from './types';

const app = new Hono<{ Bindings: Bindings }>();

// ─── CORS ───────────────────────────────────────────────
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return null;
    const allowed = [
      'http://localhost:3000',
      'http://192.168.0.104:3000',
      'https://i-was-there-psi.vercel.app',
    ];
    return allowed.includes(origin) ? origin : null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// ─── Public Assets (thumbnails, no auth) ─────────────────
app.get('/public/:key{.*}', async (c) => {
  const key = c.req.param('key');
  const object = await c.env.PUBLIC.get(key);
  if (!object) return c.json({ success: false, error: 'File not found' }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('etag', object.httpEtag);
  return new Response(object.body, { headers });
});

// ─── Asset Serving (signed URL verification) ────────────
app.get('/assets/:key{.*}', async (c) => {
  const key = c.req.param('key');
  const token = c.req.query('token');
  const expires = parseInt(c.req.query('expires') ?? '0', 10);
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';

  if (!token || !expires) {
    return c.json({ success: false, error: 'Missing token or expiry' }, 401);
  }

  console.log(`[assets] key=${key} token=${token?.slice(0, 10)}... expires=${expires}`);

  const isValid = await verifySignedToken(key, token, expires, secret);
  if (!isValid) {
    console.log(`[assets] HMAC verification FAILED for key=${key}`);
    return c.json({ success: false, error: 'Invalid or expired link' }, 401);
  }

  const head = await c.env.ASSETS.head(key);
  if (!head) {
    console.log(`[assets] File NOT FOUND in R2: ${key}`);
    return c.json({ success: false, error: 'File not found' }, 404);
  }
  console.log(`[assets] Served: ${key}`);

  const fileSize = head.size;
  const contentType = head.httpMetadata?.contentType ?? 'application/octet-stream';
  const rangeHeader = c.req.header('Range');
  const headers = new Headers();
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Type', contentType);

  if (rangeHeader) {
    const match = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
      const length = end - start + 1;
      const object = await c.env.ASSETS.get(key, { range: { offset: start, length } });
      if (!object) return c.json({ success: false, error: 'File not found' }, 404);
      headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      headers.set('Content-Length', String(length));
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return new Response(object.body, { status: 206, headers });
    }
  }

  const object = await c.env.ASSETS.get(key);
  if (!object) return c.json({ success: false, error: 'File not found' }, 404);
  headers.set('Content-Length', String(fileSize));
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(object.body, { headers });
});

// ─── Health Check ───────────────────────────────────────
app.get('/health', (c) => {
  return c.json({ success: true, data: { status: 'ok', env: c.env.ENVIRONMENT } });
});

// ─── Public Routes (no auth required) ──────────────────
app.route('/auth', authRouter);
app.route('/events', eventsRouter);

// ─── Auth Routes ────────────────────────────────────────
const auth = new Hono();
auth.use('*', authMiddleware());
auth.route('/me', meRouter);
auth.route('/generate', generateRouter);
auth.route('/generation', generationRouter);
app.route('/', auth);

// ─── Admin Routes (auth + admin required) ───────────────
const admin = new Hono();
admin.use('*', authMiddleware());
admin.use('*', requireAdmin());
admin.route('/', adminRouter);
app.route('/admin', admin);

// ─── Error Handling ─────────────────────────────────────
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    success: false,
    error: c.env.ENVIRONMENT === 'development' ? err.message : 'Internal server error',
  }, 500);
});

app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

// ─── Cron: poll generations + cleanup ─────────────────────

import { D1Helper } from './utils/d1';
import { deleteFromR2, uploadToR2 } from './utils/r2';
import { pollVideo, submitVideo } from './utils/agnes';
import { compileEventPrompts } from './utils/promptBuilder';
import type { GenerateRequest } from './shared';

async function pollEventVideos(env: Bindings) {
  const db = new D1Helper(env.DB);
  const apiKey = env.AGNES_API_KEY;
  if (!apiKey) return;
  const events = await db.getEventsWithPendingVideo();
  for (const ev of events) {
    try {
      const videoUrl = await pollVideo(ev.pendingVideoTask!, apiKey);
      if (videoUrl) {
        // Download and store in R2
        let storedUrl = videoUrl;
        try {
          const videoResp = await fetch(videoUrl);
          if (videoResp.ok && env.PUBLIC) {
            const key = `events/${ev.id}/reference.mp4`;
            await uploadToR2(env.PUBLIC, key, await videoResp.arrayBuffer(), 'video/mp4');
            const publicBase = env.R2_PUBLIC_URL || '';
            storedUrl = publicBase ? `${publicBase}/${key}` : videoUrl;
          }
        } catch {}
        await db.updateEvent(ev.id, { pendingVideoTask: null });
        console.log(`[cron] Event video stored: ${ev.id}`);
      }
    } catch { /* retry next cron */ }
  }
}

async function pollGenerations(env: Bindings) {
  const db = new D1Helper(env.DB);
  const apiKey = env.AGNES_API_KEY;
  if (!apiKey) return;

  const processing = await db.getProcessingGenerations();
  if (processing.length === 0) return;

  console.log(`[cron] Polling ${processing.length} processing generations`);

  for (const gen of processing) {
    try {
      const videoUrl = await pollVideo(gen.agnesJobId!, apiKey);
      if (videoUrl) {
        await db.updateGeneration(gen.id, { outputVideo: videoUrl, status: 'completed' });
        console.log(`[cron] Completed: ${gen.id}`);

        // Deduct credits on first completion
        try {
          const event = await db.getEventById(gen.eventId);
          const price = event?.price ?? 0;
          if (price > 0) await db.deductCredits(gen.userId, price);
        } catch {}
      }
    } catch (err) {
      const msg = String(err);
      console.error(`[cron] Poll error: ${gen.id}`, msg);
      const retries = (gen.retryVideo ?? 0) + 1;

      if (msg.includes('Agnes video failed')) {
        // Re‑submit the video with a new Agnes task
        if (retries < 3 && gen.outputImage) {
          try {
            const event = await db.getEventById(gen.eventId);
            const gameData = gen.basketball || gen.football;
            const game: GenerateRequest['football'] = gameData ? JSON.parse(gameData) : undefined;
            const { imagePrompt } = compileEventPrompts(event!, game);
            const ratio = event?.aspectRatio || '9:16';
            const sizeMap: Record<string, string> = { '9:16': '720x1280', '16:9': '1280x720', '1:1': '720x720' };
            const [w, h] = (sizeMap[ratio] || '720x1280').split('x').map(Number);
            const newTaskId = await submitVideo(imagePrompt, gen.outputImage, apiKey, 121, 24, w, h);
            await db.updateGeneration(gen.id, { agnesJobId: newTaskId, retryVideo: retries });
            console.log(`[cron] Resubmitted: ${gen.id} → ${newTaskId}`);
          } catch (resubErr) {
            console.error(`[cron] Resubmit failed: ${gen.id}`, String(resubErr));
            await db.updateGeneration(gen.id, { retryVideo: retries });
          }
        } else {
          await db.updateGenerationStatus(gen.id, 'failed', undefined, msg);
        }
      } else if (retries >= 3) {
        await db.updateGenerationStatus(gen.id, 'failed', undefined, msg);
      } else {
        await db.updateGeneration(gen.id, { retryVideo: retries });
      }
    }
  }
}

async function cleanupGenerations(env: Bindings) {
  const db = new D1Helper(env.DB);
  const expired = await db.getExpiredGenerations(3);
  if (expired.length === 0) return;
  console.log(`[cron] Cleaning up ${expired.length} expired generations`);
  for (const gen of expired) {
    const keys = [gen.inputImage, gen.outputImage].filter(Boolean) as string[];
    for (const key of keys) {
      try { await deleteFromR2(env.ASSETS, key); } catch {}
    }
    try { await db.deleteGeneration(gen.id); } catch {}
  }
}

async function scheduled(_event: ScheduledEvent, env: Bindings) {
  await pollGenerations(env);
  await pollEventVideos(env);
  await cleanupGenerations(env);
}

export default {
  fetch: app.fetch,
  scheduled,
};
