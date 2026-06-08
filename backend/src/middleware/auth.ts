import { createMiddleware } from 'hono/factory';
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

    // Find or create user — prefer email match so crawler shares the real admin identity
    const db = new D1Helper(c.env.DB);
    const adminEmails = (c.env.ADMIN_EMAILS ?? '').split(',').map((e: string) => e.trim().toLowerCase());
    const isAdmin = adminEmails.includes(payload.email?.toLowerCase() ?? '');

    // Look up existing user by email first (handles crawler + real user merging)
    let user = await db.getUserByEmail(payload.email ?? '');

    if (user) {
      // Existing user — refresh name/image
      await db.upsertUser({
        id: payload.sub,
        email: payload.email ?? '',
        name: payload.name,
        image: payload.picture,
      });
      user = await db.getUserByEmail(payload.email ?? '');
    } else {
      // New user — create with current sub as id
      await db.upsertUser({
        id: payload.sub,
        email: payload.email ?? '',
        name: payload.name,
        image: payload.picture,
      });
      user = await db.getUserById(payload.sub);
    }

    if (!user) {
      return c.json({ success: false, error: 'User not found' }, 401);
    }

    // Set role directly from email — no DB dependency
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
