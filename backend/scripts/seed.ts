/**
 * Seed script: Insert 15 historic sports events into D1.
 *
 * Usage:
 *   npx tsx scripts/seed.ts > /tmp/seed.sql
 *   npx wrangler d1 execute hotinsert-db --file=/tmp/seed.sql
 *
 * Or one-liner:
 *   npx tsx scripts/seed.ts | npx wrangler d1 execute hotinsert-db --file=/dev/stdin
 */

import { SEED_EVENTS } from '../src/seed/events';

function escape(str: string): string {
  return str.replace(/'/g, "''");
}

for (const event of SEED_EVENTS) {
  const sql = `INSERT OR IGNORE INTO events (id, title, year, location, sport_type, description, key_moment, era_clothing, image_prompt, caption_templates, hashtags, viral_score, thumbnail_url, status, created_at)
VALUES (
  '${escape(event.id)}',
  '${escape(event.title)}',
  ${event.year},
  ${event.location ? `'${escape(event.location)}'` : 'NULL'},
  '${escape(event.sportType)}',
  ${event.description ? `'${escape(event.description)}'` : 'NULL'},
  ${event.keyMoment ? `'${escape(event.keyMoment)}'` : 'NULL'},
  ${event.eraClothing ? `'${escape(event.eraClothing)}'` : 'NULL'},
  '${escape(event.imagePrompt)}',
  '${escape(event.captionTemplates)}',
  '${escape(event.hashtags)}',
  ${event.viralScore},
  ${event.thumbnailUrl ? `'${escape(event.thumbnailUrl)}'` : 'NULL'},
  '${escape(event.status)}',
  unixepoch()
);`;

  console.log(sql);
}

console.log(`\n-- Seeded ${SEED_EVENTS.length} events.`);
