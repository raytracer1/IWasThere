-- 2026 World Cup seed event
INSERT OR REPLACE INTO events (id, title, category, scene, camera, generation, status, created_at) VALUES (
  '00000001-0001-4000-8000-000000000001',
  'World Cup Final 2026 — Trophy Celebration',
  'football',
  '{"type":"soccer_stadium","venue":"MetLife Stadium","location":"East Rutherford, New Jersey","time_period":"2026","lighting":"night","weather":"clear","crowd_density":"very_high","atmosphere":["cheering","confetti","fireworks","flags_waving","tears_of_joy"],"description":"The 2026 World Cup Final at MetLife Stadium."}',
  '{"style":"broadcast_photography","angle":"spectator_view","shot_type":"medium_wide","lens":"35mm","depth_of_field":"shallow","lighting":"stadium_floodlights"}',
  '{"prompt_template":"Place this person naturally into the celebration crowd at MetLife Stadium after the 2026 World Cup Final. The person is wearing a {user_team} jersey, arms raised, face showing {mood}. Scoreboard visible showing \"{team_a} {score} {team_b}\".\n\nThe winning team''s fans around them are in a state of pure ecstasy — hugging strangers, waving flags, phones out recording history. Golden confetti raining down, fireworks in the night sky, the World Cup trophy gleaming on the podium.\n\nThe person should look genuinely part of this historic celebration — same stadium floodlights, same warm golden lighting, same emotional intensity.\n\nVisual style: Ultra-realistic DSLR sports photography, World Cup broadcast aesthetic, shallow depth of field, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.","negative_prompt":"blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on field","background_image":"","insert_zone":""}',
  'active',
  unixepoch()
);
