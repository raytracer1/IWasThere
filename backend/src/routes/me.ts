import { Hono } from 'hono';
import { D1Helper } from '../utils/d1';
import type { Bindings } from '../types';

const meRouter = new Hono<{ Bindings: Bindings }>();

meRouter.get('/', async (c) => {
  const user = c.get('user');
  const db = new D1Helper(c.env.DB);

  // Get fresh credits from DB
  const dbUser = await db.getUserByEmail(user.email);
  const credits = dbUser?.credits ?? 0;

  return c.json({
    success: true,
    data: { email: user.email, name: user.name, image: user.image, credits },
  });
});

export default meRouter;
