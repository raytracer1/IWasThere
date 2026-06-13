-- IfIWasThere: Drop old HotInsert tables, create new schema

DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS rate_limits;

-- Historic Sports Events
CREATE TABLE IF NOT EXISTS events (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  year              INTEGER NOT NULL,
  location          TEXT,
  sport_type        TEXT NOT NULL,
  description       TEXT,
  key_moment        TEXT,
  era_clothing      TEXT,
  image_prompt      TEXT NOT NULL,
  caption_templates TEXT,
  hashtags          TEXT,
  viral_score       REAL NOT NULL DEFAULT 5.0,
  thumbnail_url     TEXT,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'draft', 'archived')),
  created_at        INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_events_sport ON events(sport_type);
CREATE INDEX idx_events_viral ON events(viral_score DESC);
CREATE INDEX idx_events_status ON events(status);

-- AI Generations
CREATE TABLE IF NOT EXISTS generations (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  event_id        TEXT NOT NULL REFERENCES events(id),
  input_image     TEXT NOT NULL,
  output_image    TEXT,
  agnes_job_id    TEXT,
  status          TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  error_message   TEXT,
  captions        TEXT,
  selected_caption TEXT,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at    INTEGER
);

CREATE INDEX idx_generations_user ON generations(user_id);
CREATE INDEX idx_generations_event ON generations(event_id);
CREATE INDEX idx_generations_status ON generations(status);
