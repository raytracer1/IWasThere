-- Change event_id to nullable (ON DELETE SET NULL) so deleting an event keeps its jobs
-- SQLite doesn't support ALTER COLUMN, so recreate the table

-- 1. Create new jobs table with ON DELETE SET NULL
CREATE TABLE jobs_new (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  event_id       TEXT REFERENCES events(id) ON DELETE SET NULL,
  fal_request_id TEXT,
  input_image    TEXT NOT NULL,
  output_video   TEXT,
  status         TEXT NOT NULL DEFAULT 'queued'
                 CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  error_message  TEXT,
  created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at   INTEGER
);

-- 2. Copy existing data
INSERT INTO jobs_new SELECT * FROM jobs;

-- 3. Drop old table
DROP TABLE jobs;

-- 4. Rename new table
ALTER TABLE jobs_new RENAME TO jobs;

-- 5. Recreate indexes
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_fal_request_id ON jobs(fal_request_id);
CREATE INDEX idx_jobs_event_id ON jobs(event_id);
