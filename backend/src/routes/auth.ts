import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import type { Bindings } from '../types';

const authRouter = new Hono<{ Bindings: Bindings }>();

/**
 * POST /auth/login — Called by NextAuth JWT callback on Google sign-in.
 * Creates user if not exists, returns the user record.
 */
authRouter.post('/login', async (c) => {
  const body = await c.req.json<{ email: string; name?: string; picture?: string; sub: string }>();
  const { email, name, picture, sub } = body;

  if (!email) {
    return c.json({ success: false, error: 'email is required' }, 400);
  }

  const db = new D1Helper(c.env.DB);
  let user = await db.getUserByEmail(email);

  if (!user) {
    await db.createUser({
      id: sub,
      email,
      name,
      image: picture,
      credits: 1.0,
    });
    user = await db.getUserByEmail(email);
  }

  return c.json({ success: true, data: user });
});

export default authRouter;
