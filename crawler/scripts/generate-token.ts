/**
 * Generate a long-lived JWT for the crawler.
 * Usage: npx tsx scripts/generate-token.ts
 *
 * Requires: AUTH_SECRET env (same as Worker's AUTH_SECRET)
 *           CRAWLER_EMAIL env (an email listed in ADMIN_EMAILS)
 */

import { SignJWT } from 'jose';

async function main() {
  const secret = process.env.AUTH_SECRET;
  const email = process.env.CRAWLER_EMAIL;

  if (!secret) {
    console.error('❌ Set AUTH_SECRET env (same value as Worker secret)');
    process.exit(1);
  }
  if (!email) {
    console.error('❌ Set CRAWLER_EMAIL env (must be in ADMIN_EMAILS)');
    process.exit(1);
  }

  const encoder = new TextEncoder();

  const token = await new SignJWT({
    sub: `crawler-${Date.now()}`,
    email,
    name: 'Crawler Bot',
    picture: undefined,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d') // 1 year
    .sign(encoder.encode(secret));

  console.log('\n✅ Crawler JWT generated:\n');
  console.log(token);
  console.log('\nCopy this into crawler/.env:');
  console.log(`CRAWLER_TOKEN=${token}`);
}

main().catch(console.error);
