-- IfIWasThere: Make object_id the PRIMARY KEY, demote id to UNIQUE column
-- Run: npx wrangler d1 execute hotinsert-db --file=./migrations/0011_object_id_pk.sql

PRAGMA foreign_keys = OFF;

-- 1. Rename old table
ALTER TABLE events RENAME TO events_old;

-- 2. Create new table with object_id as PK
CREATE TABLE events (
  object_id         TEXT PRIMARY KEY,
  id                TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  category          TEXT NOT NULL,
  event_type        TEXT,
  scene             TEXT NOT NULL DEFAULT '{}',
  emotion           TEXT NOT NULL DEFAULT '{}',
  camera            TEXT NOT NULL DEFAULT '{}',
  user              TEXT NOT NULL DEFAULT '{}',
  entities          TEXT NOT NULL DEFAULT '{}',
  moment            TEXT NOT NULL DEFAULT '{}',
  generation        TEXT NOT NULL DEFAULT '{}',
  thumbnail_url     TEXT,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'draft', 'archived')),
  created_at        INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 3. Recreate indexes
CREATE UNIQUE INDEX idx_events_id ON events(id);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_created_at ON events(created_at);

-- 4. Copy data
INSERT INTO events (object_id, id, title, category, event_type, scene, emotion, camera, user, entities, moment, generation, thumbnail_url, status, created_at)
SELECT object_id, id, title, category, event_type, scene, emotion, camera, user, entities, moment, generation, thumbnail_url, status, created_at
FROM events_old;

-- 5. Drop old table
DROP TABLE events_old;

PRAGMA foreign_keys = ON;
