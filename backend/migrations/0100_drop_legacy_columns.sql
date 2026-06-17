-- Remove columns replaced by user customization on create page
ALTER TABLE events DROP COLUMN emotion;
ALTER TABLE events DROP COLUMN "user";
ALTER TABLE events DROP COLUMN entities;
ALTER TABLE events DROP COLUMN moment;
