import { createMiddleware } from 'hono/factory';
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
 * Verify JWT and set user from token payload.
 * Admin role is determined by ADMIN_EMAILS env var — no DB query.
 */
export function authMiddleware() {
  return createMiddleware(async (c, next) => {
    // Dev mode: skip real auth
    if (c.env.SKIP_AUTH === 'true') {
      c.set('user', {
        id: 'dev-user',
        email: 'dev@localhost',
        name: 'Dev Admin',
        image: '',
        role: 'admin',
        credits: 999,
        createdAt: Date.now(),
      });
      await next();
      return;
    }

    const result = await verifyJwt(c);
    if (result instanceof Response) return result;
    const payload = result;

    const adminEmails = (c.env.ADMIN_EMAILS ?? '').split(',').map((e: string) => e.trim().toLowerCase());
    const isAdmin = adminEmails.includes(payload.email?.toLowerCase() ?? '');

    c.set('user', {
      id: payload.sub,
      email: payload.email ?? '',
      name: payload.name,
      image: payload.picture,
      role: isAdmin ? 'admin' : 'user',
      credits: 0,
      createdAt: 0,
    });

    await next();
  });
}

/**
 * Middleware: require admin role. Must be used after authMiddleware().
 */
export function requireAdmin() {
  return createMiddleware(async (c, next) => {
    // Dev mode: skip admin check (authMiddleware already sets fake admin)
    if (c.env.SKIP_AUTH === 'true') {
      await next();
      return;
    }
    const user = c.get('user');
    if (user.role !== 'admin') {
      return c.json({ success: false, error: 'Admin access required' }, 403);
    }
    await next();
  });
}
