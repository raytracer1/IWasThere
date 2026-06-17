-- Full reset: drop everything, rebuild with current schema
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS generations;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  image       TEXT,
  role        TEXT NOT NULL DEFAULT 'user',
  credits     REAL DEFAULT 1.0,
  created_at  INTEGER DEFAULT (unixepoch())
);

-- Events (current schema — no emotion/user/entities/moment)
CREATE TABLE IF NOT EXISTS events (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  category          TEXT NOT NULL,
  event_type        TEXT,
  scene             TEXT NOT NULL DEFAULT '{}',
  camera            TEXT NOT NULL DEFAULT '{}',
  generation        TEXT NOT NULL DEFAULT '{}',
  reference_video   TEXT,
  thumbnail_url     TEXT,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at        INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Generations
CREATE TABLE IF NOT EXISTS generations (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  event_id        TEXT REFERENCES events(id) ON DELETE SET NULL,
  input_image     TEXT NOT NULL,
  output_image    TEXT,
  agnes_job_id    TEXT,
  status          TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  error_message   TEXT,
  captions        TEXT,
  selected_caption TEXT,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_generations_user ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_event ON generations(event_id);

PRAGMA foreign_keys = ON;
