import { createMiddleware } from 'hono/factory';
import type { User } from '../shared';
import { D1Helper } from '../utils/d1';

// JWT payload from NextAuth — verified with jose
interface JwtPayload {
  sub: string;        // user ID
  email: string;
  name?: string;
  picture?: string;
  iat: number;
  exp: number;
}

// Extend Hono's context to carry user info
declare module 'hono' {
  interface ContextVariableMap {
    user: User;
  }
}

/**
 * Middleware: verify JWT token and attach user to context.
 * Uppercases the user in D1 (creates on first API call).
 */
export function authMiddleware() {
  return createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.slice(7);
    const authSecret = c.env.AUTH_SECRET;

    if (!authSecret) {
      return c.json({ success: false, error: 'Server auth configuration error' }, 500);
    }

    let payload: JwtPayload;
    try {
      const { jwtVerify, createRemoteJWKSet } = await import('jose');

      // Verify using the shared AUTH_SECRET (HS256 for NextAuth JWT)
      const encoder = new TextEncoder();
      const { payload: verified } = await jwtVerify(
        token,
        encoder.encode(authSecret),
        {
          algorithms: ['HS256'],
        }
      );

      payload = verified as unknown as JwtPayload;
    } catch (err) {
      return c.json({ success: false, error: 'Invalid or expired token' }, 401);
    }

    // Upsert user into D1 on each request (lightweight, ensures user exists)
    const db = new D1Helper(c.env.DB);
    const adminEmails = (c.env.ADMIN_EMAILS ?? '').split(',').map((e: string) => e.trim().toLowerCase());
    const role = adminEmails.includes(payload.email?.toLowerCase() ?? '') ? 'admin' : 'user';

    await db.upsertUser({
      id: payload.sub,
      email: payload.email ?? '',
      name: payload.name,
      image: payload.picture,
      role: role as User['role'],
    });

    // Attach user to context
    const user = await db.getUserById(payload.sub);
    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 401);
    }

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
