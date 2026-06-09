-- Add price column to events table
ALTER TABLE events ADD COLUMN price REAL NOT NULL DEFAULT 0.50;
