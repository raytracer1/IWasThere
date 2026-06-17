-- HotInsert AI: Initial Schema Migration
-- Run: wrangler d1 execute hotinsert-db --file=./migrations/0001_init.sql

-- ─── Users ──────────────────────────────────────────────
-- NextAuth user ID format: e.g., "google_oauth2|123456"
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  image       TEXT,                   -- Google avatar URL
  role        TEXT NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ─── Hot Events ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('sports', 'music', 'movies', 'news', 'other')),
  description   TEXT,
  video_url     TEXT NOT NULL,        -- R2 object key: hot-events/{eventId}/video.mp4
  thumbnail_url TEXT,                 -- R2 object key: hot-events/{eventId}/thumbnail.jpg
  duration      INTEGER,             -- seconds
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_by    TEXT NOT NULL REFERENCES users(id),
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- ─── Swap Jobs ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  event_id       TEXT NOT NULL REFERENCES events(id),
  fal_request_id TEXT,               -- fal.ai queue request ID
  input_image    TEXT NOT NULL,      -- R2 object key of user selfie
  output_video   TEXT,               -- R2 object key or fal.ai result URL
  status         TEXT NOT NULL DEFAULT 'queued'
                 CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  error_message  TEXT,
  created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_fal_request_id ON jobs(fal_request_id);

-- ─── Rate Limits ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id TEXT NOT NULL REFERENCES users(id),
  date    TEXT NOT NULL,              -- 'YYYY-MM-DD'
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
