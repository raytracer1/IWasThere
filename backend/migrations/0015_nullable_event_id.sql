-- Make generations.event_id nullable, add ON DELETE SET NULL
PRAGMA foreign_keys = OFF;

DROP INDEX IF EXISTS idx_generations_user;
DROP INDEX IF EXISTS idx_generations_event;
DROP INDEX IF EXISTS idx_generations_status;
DROP TABLE IF EXISTS generations_old;

ALTER TABLE generations RENAME TO generations_old;

CREATE TABLE generations (
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

CREATE INDEX idx_generations_user ON generations(user_id);
CREATE INDEX idx_generations_event ON generations(event_id);

INSERT INTO generations SELECT * FROM generations_old;

DROP TABLE generations_old;

PRAGMA foreign_keys = ON;
