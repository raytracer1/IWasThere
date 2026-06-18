INSERT OR IGNORE INTO events (id, title, category, scene, camera, generation, status, created_at) VALUES (
  '00000001-0001-4000-8000-000000000002',
  'NBA Finals 2026 — Championship Moment',
  'basketball',
  '{"type":"basketball_arena","venue":"TD Garden","location":"Boston, Massachusetts","time_period":"2026","lighting":"arena","weather":"indoor","crowd_density":"very_high","atmosphere":["cheering","playoff_intensity","championship","confetti"],"description":"The 2026 NBA Finals. One team will be crowned champions."}',
  '{"style":"broadcast_photography","angle":"spectator_view","shot_type":"medium_wide","lens":"35mm","depth_of_field":"shallow","lighting":"arena_spotlights"}',
  '{"prompt_template":"Place this person naturally into the crowd at TD Garden during the 2026 NBA Finals. The scoreboard shows \"{team_a} {score} {team_b}\". The person is facing the camera, looking toward the court.\n\nThe arena is electric — playoff intensity, championship on the line. The Larry O''Brien trophy visible courtside.\n\nThe person is a front-facing spectator, face clearly visible, looking out at the court. The person should look genuinely part of this historic moment — same arena lighting, same dramatic intensity, same championship atmosphere.\n\nVisual style: Ultra-realistic DSLR sports photography, NBA broadcast aesthetic, shallow depth of field, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.","negative_prompt":"blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on court, back turned, facing away from camera","insert_zone":""}',
  'active',
  unixepoch()
);
