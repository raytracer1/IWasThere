import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware, jwtMiddleware, requireAdmin } from './middleware/auth';
import { D1Helper } from './utils/d1';
import eventsRouter from './routes/events';
import uploadRouter from './routes/upload';
import swapRouter from './routes/swap';
import jobRouter from './routes/job';
import historyRouter from './routes/history';
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

  // Verify signed token
  if (!token || !expires) {
    return c.json({ success: false, error: 'Missing token or expiry' }, 401);
  }

  const isValid = await verifySignedToken(key, token, expires, secret);
  if (!isValid) {
    return c.json({ success: false, error: 'Invalid or expired link' }, 401);
  }

  // Serve from R2
  const object = await c.env.ASSETS.get(key);
  if (!object) {
    return c.json({ success: false, error: 'File not found' }, 404);
  }

  const headers = new Headers();
  if (object.httpMetadata?.contentType) {
    headers.set('Content-Type', object.httpMetadata.contentType);
  }
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
});

// ─── Health Check ───────────────────────────────────────
app.get('/health', (c) => {
  return c.json({ success: true, data: { status: 'ok', env: c.env.ENVIRONMENT } });
});

// ─── Current User (registration happens here) ─────────────
app.get('/me', jwtMiddleware(), async (c) => {
  const payload = c.get('jwtPayload') as { sub: string; email: string; name?: string; picture?: string };
  const db = new D1Helper(c.env.DB);
  const adminEmails = (c.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase());
  const role = adminEmails.includes(payload.email?.toLowerCase() ?? '') ? 'admin' : 'user';

  // Check if user already exists
  let user = await db.getUserByEmail(payload.email);

  if (!user) {
    // New user — create in DB
    await db.upsertUser({
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      image: payload.picture,
      credits: 0,
    });
    user = await db.getUserByEmail(payload.email);
  }

  return c.json({ success: true, data: { id: payload.sub, email: payload.email, role, credits: user?.credits ?? 0 } });
});

// ─── Protected Routes ───────────────────────────────────
const api = new Hono();

// Routes that require authentication
api.use('/events/*', authMiddleware());
api.use('/upload/*', authMiddleware());
api.use('/swap/*', authMiddleware());
api.use('/job/*', authMiddleware());
api.use('/history/*', authMiddleware());
api.use('/admin/*', authMiddleware());
api.use('/admin/*', requireAdmin());

// Mount route modules
api.route('/events', eventsRouter);
api.route('/upload', uploadRouter);
api.route('/swap', swapRouter);
api.route('/job', jobRouter);
api.route('/history', historyRouter);
api.route('/admin', adminRouter);

app.route('/', api);

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
