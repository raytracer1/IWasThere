-- IfIWasThere: Drop old tables, create new schema

DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS generations;
DROP TABLE IF EXISTS rate_limits;

-- Historic Sports Events
CREATE TABLE IF NOT EXISTS events (
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
