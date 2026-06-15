-- IfIWasThere: Migrate events to new nested-object schema
-- Run: npx wrangler d1 execute hotinsert-db --file=./migrations/0009_new_event_schema.sql

-- Disable FK checks while rebuilding the table
PRAGMA foreign_keys = OFF;

-- Drop all old indexes (must be done before rename, since index names are global)
DROP INDEX IF EXISTS idx_events_sport;
DROP INDEX IF EXISTS idx_events_viral;
DROP INDEX IF EXISTS idx_events_status;
DROP INDEX IF EXISTS idx_events_category;
DROP INDEX IF EXISTS idx_events_created_at;

-- Drop old columns, add new columns
-- SQLite doesn't support DROP COLUMN easily, so we rebuild the table

-- 1. Rename old table
ALTER TABLE events RENAME TO events_old;

-- 2. Create new table with updated schema
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

-- 3. Create new indexes
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_created_at ON events(created_at);

-- 4. Migrate data: convert old flat columns → new nested JSON structure
INSERT INTO events (id, title, category, event_type, scene, emotion, camera, user, entities, moment, generation, thumbnail_url, status, created_at)
SELECT
  id,
  title,
  sport_type AS category,
  'sports' AS event_type,
  -- scene: location, description, time_period
  json_object(
    'location', COALESCE(location, ''),
    'time_period', CAST(year AS TEXT),
    'description', COALESCE(description, ''),
    'atmosphere', ''
  ) AS scene,
  -- emotion: empty defaults
  '{}' AS emotion,
  -- camera: empty defaults
  '{}' AS camera,
  -- user: clothing from era_clothing
  json_object(
    'clothing', COALESCE(era_clothing, ''),
    'action', '',
    'position', '',
    'role', 'spectator'
  ) AS user,
  -- entities: empty defaults
  '{}' AS entities,
  -- moment: key_action from key_moment
  json_object(
    'key_action', COALESCE(key_moment, ''),
    'description', COALESCE(key_moment, ''),
    'timing', '',
    'significance', ''
  ) AS moment,
  -- generation: prompt_template from image_prompt, preserve captions/hashtags as extra fields
  json_object(
    'prompt_template', COALESCE(image_prompt, ''),
    'negative_prompt', '',
    'background_image', '',
    'insert_zone', ''
  ) AS generation,
  thumbnail_url,
  status,
  created_at
FROM events_old;

-- 5. Drop old table
DROP TABLE events_old;

-- Re-enable FK checks
PRAGMA foreign_keys = ON;
