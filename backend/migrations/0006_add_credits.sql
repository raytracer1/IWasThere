-- Add credits column to users table
ALTER TABLE users ADD COLUMN credits INTEGER NOT NULL DEFAULT 0;
