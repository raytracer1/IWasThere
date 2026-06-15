-- Fix signed URLs that were incorrectly stored in DB.
-- Extract R2 keys from URLs like https://.../assets/<key>?token=...

-- Function: extract key from signed URL
-- In SQLite, we find '/assets/' and strip everything before it, then strip '?...'
-- Result: events/<uuid>/thumbnail.jpg

-- Fix thumbnail_url
UPDATE events
SET thumbnail_url = CASE
  WHEN thumbnail_url LIKE '%/assets/%?token=%' THEN
    substr(
      substr(thumbnail_url, instr(thumbnail_url, '/assets/') + 8),
      1,
      instr(substr(thumbnail_url, instr(thumbnail_url, '/assets/') + 8), '?') - 1
    )
  ELSE thumbnail_url
END
WHERE thumbnail_url LIKE '%/assets/%?token=%';

-- Fix reference_video
UPDATE events
SET reference_video = CASE
  WHEN reference_video LIKE '%/assets/%?token=%' THEN
    substr(
      substr(reference_video, instr(reference_video, '/assets/') + 8),
      1,
      instr(substr(reference_video, instr(reference_video, '/assets/') + 8), '?') - 1
    )
  ELSE reference_video
END
WHERE reference_video LIKE '%/assets/%?token=%';

-- Fix generation.background_image (inside JSON column)
UPDATE events
SET generation = json_set(
  generation,
  '$.background_image',
  substr(
    substr(json_extract(generation, '$.background_image'), instr(json_extract(generation, '$.background_image'), '/assets/') + 8),
    1,
    instr(substr(json_extract(generation, '$.background_image'), instr(json_extract(generation, '$.background_image'), '/assets/') + 8), '?') - 1
  )
)
WHERE json_extract(generation, '$.background_image') LIKE '%/assets/%?token=%';
