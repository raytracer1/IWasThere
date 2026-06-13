import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware, jwtMiddleware, requireAdmin } from './middleware/auth';
import { D1Helper } from './utils/d1';
import authRouter from './routes/auth';
import eventsRouter from './routes/events';
import uploadRouter from './routes/upload';
import generateRouter from './routes/generate';
import generationRouter from './routes/generation';
import generationsRouter from './routes/generations';
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

// ─── Public: Asset Serving (signed URL verification) ────
app.get('/assets/:key{.*}', async (c) => {
  const key = c.req.param('key');
  const token = c.req.query('token');
  const expires = parseInt(c.req.query('expires') ?? '0', 10);
  const secret = c.env.AUTH_SECRET ?? 'dev-secret';

  if (!token || !expires) {
    return c.json({ success: false, error: 'Missing token or expiry' }, 401);
  }

  const isValid = await verifySignedToken(key, token, expires, secret);
  if (!isValid) {
    return c.json({ success: false, error: 'Invalid or expired link' }, 401);
  }

  const head = await c.env.ASSETS.head(key);
  if (!head) {
    return c.json({ success: false, error: 'File not found' }, 404);
  }

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

      const object = await c.env.ASSETS.get(key, {
        range: { offset: start, length },
      });

      if (!object) {
        return c.json({ success: false, error: 'File not found' }, 404);
      }

      headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      headers.set('Content-Length', String(length));
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');

      return new Response(object.body, {
        status: 206,
        headers,
      });
    }
  }

  const object = await c.env.ASSETS.get(key);
  if (!object) {
    return c.json({ success: false, error: 'File not found' }, 404);
  }

  headers.set('Content-Length', String(fileSize));
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
});

// ─── Health Check ───────────────────────────────────────
app.get('/health', (c) => {
  return c.json({ success: true, data: { status: 'ok', env: c.env.ENVIRONMENT } });
});

// ─── Current User (registration happens here) ───────────
app.get('/me', jwtMiddleware(), async (c) => {
  const payload = c.get('jwtPayload') as { sub: string; email: string; name?: string; picture?: string };
  const db = new D1Helper(c.env.DB);
  const adminEmails = (c.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase());
  const role = adminEmails.includes(payload.email?.toLowerCase() ?? '') ? 'admin' : 'user';

  let user = await db.getUserByEmail(payload.email);

  if (!user) {
    await db.upsertUser({
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      image: payload.picture,
      credits: 1,
    });
    user = await db.getUserByEmail(payload.email);
  }

  return c.json({
    success: true,
    data: { id: payload.sub, email: payload.email, role, credits: user?.credits ?? 0 },
  });
});

// ─── Google Auth (native clients) ───────────────────────
app.route('/auth', authRouter);

// ─── Public Routes (no auth required) ──────────────────
app.route('/events', eventsRouter);
app.route('/upload', uploadRouter);
app.route('/generate', generateRouter);
app.route('/generation', generationRouter);

// ─── Admin Routes (auth + admin required) ──────────────
const admin = new Hono();
admin.use('/admin/*', authMiddleware());
admin.use('/admin/*', requireAdmin());
admin.route('/admin', adminRouter);
app.route('/', admin);

// ─── Error Handling ─────────────────────────────────────
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    success: false,
    error: c.env.ENVIRONMENT === 'development' ? err.message : 'Internal server error',
  }, 500);
});

// ─── 404 ────────────────────────────────────────────────
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

export default app;
