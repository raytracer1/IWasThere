import { createMiddleware } from 'hono/factory';
import { D1Helper } from '../utils/d1';
import type { Context } from 'hono';
import type { User } from '../shared';

// JWT payload from NextAuth — verified with jose
interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  iat: number;
  exp: number;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: User;
    jwtPayload: { sub: string; email: string; name?: string; picture?: string };
  }
}

/** Verify JWT, return payload or error response */
async function verifyJwt(c: Context): Promise<JwtPayload | Response> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  const authSecret = c.env.AUTH_SECRET;
  if (!authSecret) {
    return c.json({ success: false, error: 'Server auth configuration error' }, 500);
  }

  const { jwtVerify } = await import('jose');
  const encoder = new TextEncoder();
  try {
    const { payload: verified } = await jwtVerify(token, encoder.encode(authSecret), { algorithms: ['HS256'] });
    return verified as unknown as JwtPayload;
  } catch {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }
}

/**
 * Verify JWT only, set payload. Used by /me for new user registration.
 * Does NOT require the user to exist in DB.
 */
export function jwtMiddleware() {
  return createMiddleware(async (c, next) => {
    const result = await verifyJwt(c);
    if (result instanceof Response) return result;
    c.set('jwtPayload', result);
    await next();
  });
}

/**
 * Verify JWT + lookup user in DB. Returns 401 if user doesn't exist.
 * Refreshes name/image on each request.
 */
export function authMiddleware() {
  return createMiddleware(async (c, next) => {
    const result = await verifyJwt(c);
    if (result instanceof Response) return result;
    const payload = result;

    const db = new D1Helper(c.env.DB);
    const adminEmails = (c.env.ADMIN_EMAILS ?? '').split(',').map((e: string) => e.trim().toLowerCase());
    const isAdmin = adminEmails.includes(payload.email?.toLowerCase() ?? '');

    let user = await db.getUserByEmail(payload.email ?? '');
    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 401);
    }

    // Refresh name/image
    await db.upsertUser({
      id: payload.sub,
      email: payload.email ?? '',
      name: payload.name,
      image: payload.picture,
      credits: user.credits,
    });

    // Re-fetch after upsert
    const refreshed = await db.getUserByEmail(payload.email ?? '');
    if (!refreshed) {
      return c.json({ success: false, error: 'User not found' }, 401);
    }
    user = refreshed;
    user.role = isAdmin ? 'admin' : 'user';
    c.set('user', user);
    await next();
  });
}

/**
 * Middleware: require admin role. Must be used after authMiddleware().
 */
export function requireAdmin() {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    if (user.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }
    await next();
  });
}
