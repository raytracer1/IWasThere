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
import { deleteFromR2 } from './utils/r2';
import { pollVideo } from './utils/agnes';

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
      console.error(`[cron] Failed: ${gen.id}`, String(err));
      await db.updateGenerationStatus(gen.id, 'failed', undefined, String(err));
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
  await cleanupGenerations(env);
}

export default {
  fetch: app.fetch,
  scheduled,
};
