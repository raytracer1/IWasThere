import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import type { Bindings } from '../types';

const authRouter = new Hono<{ Bindings: Bindings }>();

/**
 * POST /auth/google — Exchange a Google idToken for a session JWT.
 *
 * Used by the Flutter iOS app (and any native client) that can't
 * go through NextAuth to get a session token.
 *
 * Body: { idToken: string }
 * Returns: { success: true, data: { token: string, user: User } }
 */
authRouter.post('/google', async (c) => {
  let body: { idToken?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { idToken } = body;
  if (!idToken) {
    return c.json({ success: false, error: 'idToken is required' }, 400);
  }

  // Verify the Google idToken
  let googlePayload: { sub: string; email: string; name?: string; picture?: string };
  try {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (!response.ok) {
      return c.json({ success: false, error: 'Invalid Google idToken' }, 401);
    }
    const data = await response.json();
    googlePayload = {
      sub: data.sub as string,
      email: data.email as string,
      name: data.name as string | undefined,
      picture: data.picture as string | undefined,
    };
  } catch {
    return c.json({ success: false, error: 'Failed to verify Google idToken' }, 401);
  }

  const db = new D1Helper(c.env.DB);
  const adminEmails = (c.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase());
  const role = adminEmails.includes(googlePayload.email?.toLowerCase() ?? '') ? 'admin' : 'user';

  // Upsert user in D1
  let user = await db.getUserByEmail(googlePayload.email);
  if (!user) {
    // New user — create with $1 welcome credit
    await db.upsertUser({
      id: googlePayload.sub,
      email: googlePayload.email,
      name: googlePayload.name,
      image: googlePayload.picture,
      credits: 1,
    });
    user = await db.getUserByEmail(googlePayload.email);
  } else {
    // Refresh name/image
    await db.upsertUser({
      id: googlePayload.sub,
      email: googlePayload.email,
      name: googlePayload.name,
      image: googlePayload.picture,
      credits: user.credits,
    });
    user = await db.getUserByEmail(googlePayload.email);
  }

  if (!user) {
    return c.json({ success: false, error: 'Failed to create user' }, 500);
  }

  // Generate a session JWT signed with AUTH_SECRET (same format as NextAuth tokens)
  const authSecret = c.env.AUTH_SECRET;
  if (!authSecret) {
    return c.json({ success: false, error: 'Server auth configuration error' }, 500);
  }

  const { SignJWT } = await import('jose');
  const encoder = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    sub: googlePayload.sub,
    email: googlePayload.email,
    name: googlePayload.name,
    picture: googlePayload.picture,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 30 * 24 * 60 * 60) // 30 days
    .sign(encoder.encode(authSecret));

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role,
        credits: user.credits,
        createdAt: user.createdAt,
      },
    },
  });
});

export default authRouter;
