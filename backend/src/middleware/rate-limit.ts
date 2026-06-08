import { createMiddleware } from 'hono/factory';
import { D1Helper } from '../utils/d1';
import { DAILY_GENERATION_LIMIT } from '../shared';

/**
 * Middleware: Check daily generation rate limit.
 * Must be used after authMiddleware (sets user in context).
 * Only applies to the /swap endpoint.
 */
export function rateLimitMiddleware() {
  return createMiddleware(async (c, next) => {
    const user = c.get('user');
    const db = new D1Helper(c.env.DB);

    const todayCount = await db.getTodayGenerationCount(user.id);

    if (todayCount >= DAILY_GENERATION_LIMIT) {
      return c.json({
        success: false,
        error: `Daily limit reached (${DAILY_GENERATION_LIMIT}/day). Try again tomorrow.`,
        data: { remaining: 0, limit: DAILY_GENERATION_LIMIT },
      }, 429);
    }

    // Add rate limit info to response headers
    c.header('X-RateLimit-Limit', String(DAILY_GENERATION_LIMIT));
    c.header('X-RateLimit-Remaining', String(DAILY_GENERATION_LIMIT - todayCount - 1));

    await next();
  });
}
