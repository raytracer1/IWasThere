-- Drop FK constraint on generations.user_id (anonymous users don't exist in users table)
DROP TABLE IF EXISTS generations;

CREATE TABLE IF NOT EXISTS generations (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL DEFAULT 'anonymous',
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

CREATE INDEX IF NOT EXISTS idx_generations_user ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_event ON generations(event_id);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);
