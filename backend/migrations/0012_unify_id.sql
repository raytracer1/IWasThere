-- IfIWasThere: Drop slug id column, rename object_id to id (PK)
-- Run: npx wrangler d1 execute hotinsert-db --file=./migrations/0012_unify_id.sql

PRAGMA foreign_keys = OFF;

-- Drop all indexes on old table (names are global)
DROP INDEX IF EXISTS idx_events_id;
DROP INDEX IF EXISTS idx_events_object_id;
DROP INDEX IF EXISTS idx_events_category;
DROP INDEX IF EXISTS idx_events_status;
DROP INDEX IF EXISTS idx_events_created_at;
DROP INDEX IF EXISTS idx_events_sport;
DROP INDEX IF EXISTS idx_events_viral;

ALTER TABLE events RENAME TO events_old;

CREATE TABLE events (
  id                TEXT PRIMARY KEY,
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

CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_created_at ON events(created_at);

INSERT INTO events (id, title, category, event_type, scene, emotion, camera, user, entities, moment, generation, thumbnail_url, status, created_at)
SELECT object_id, title, category, event_type, scene, emotion, camera, user, entities, moment, generation, thumbnail_url, status, created_at
FROM events_old;

DROP TABLE events_old;

PRAGMA foreign_keys = ON;
