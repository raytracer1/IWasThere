-- IfIWasThere: Add object_id column to events
-- Run: npx wrangler d1 execute hotinsert-db --file=./migrations/0010_add_object_id.sql

ALTER TABLE events ADD COLUMN object_id TEXT;
CREATE UNIQUE INDEX idx_events_object_id ON events(object_id);

-- Generate UUIDs for existing events
UPDATE events SET object_id = lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1,1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))) WHERE object_id IS NULL;
