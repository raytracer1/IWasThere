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
  const sql = `INSERT OR IGNORE INTO events (id, title, category, event_type, scene, emotion, camera, user, entities, moment, generation, thumbnail_url, status, created_at)
VALUES (
  '${escape(event.id)}',
  '${escape(event.title)}',
  '${escape(event.category)}',
  ${event.event_type ? `'${escape(event.event_type)}'` : 'NULL'},
  '${escape(JSON.stringify(event.scene))}',
  '${escape(JSON.stringify(event.emotion))}',
  '${escape(JSON.stringify(event.camera))}',
  '${escape(JSON.stringify(event.user))}',
  '${escape(JSON.stringify(event.entities))}',
  '${escape(JSON.stringify(event.moment))}',
  '${escape(JSON.stringify(event.generation))}',
  ${event.thumbnailUrl ? `'${escape(event.thumbnailUrl)}'` : 'NULL'},
  '${escape(event.status)}',
  unixepoch()
);`;

  console.log(sql);
}

console.log(`\n-- Seeded ${SEED_EVENTS.length} events.`);
