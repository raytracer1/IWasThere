-- Store In/Out frame ranges for video trimming
ALTER TABLE events ADD COLUMN trim_ranges TEXT;
