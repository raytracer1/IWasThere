-- Seed: Trojan Horse event
INSERT OR IGNORE INTO events (id, title, category, scene, camera, generation, status, created_at) VALUES (
  '00000001-0001-4000-8000-000000000005',
  'The Fall of Troy — Trojan Horse',
  'history',
  '{"type":"ancient_city","venue":"Gates of Troy","location":"Troy, Ancient Greece","time_period":"1184 BC","lighting":"night","weather":"clear","crowd_density":"high","atmosphere":["awe","treachery","fire_glow","ancient_world","legendary"],"description":"The Trojan Horse stands at the gates of Troy. Greek soldiers hidden inside. The city is about to fall."}',
  '{"style":"cinematic_photography","angle":"spectator_view","shot_type":"wide","lens":"35mm","depth_of_field":"deep","lighting":"firelight_night"}',
  '{"prompt_template":"Place this person naturally among the crowd at the gates of ancient Troy. Behind them looms the massive wooden Trojan Horse — an impossibly huge structure, its hollow belly hiding Greek soldiers. Torches flicker in the night, casting dancing shadows on the ancient stone walls.\n\nThe person is a Trojan citizen, standing near the horse, face showing a mix of awe and unease — something feels wrong about this \"gift.\" The massive wooden structure towers over the crowd, firelight illuminating its carved surface. The city of Troy in the background, not yet knowing its fate.\n\nThe person is facing forward, looking up at the horse, face clearly visible in the torchlight. THE PERSON MUST FACE THE CAMERA with their face fully visible, lit by warm firelight.\n\nVisual style: Ultra-realistic cinematic photography, epic historical film aesthetic, dramatic firelight and torchlight, deep shadows, 8K, anamorphic lens. Keep facial features intact. No text or logos.","negative_prompt":"blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, back turned, facing away from camera, person facing backwards, back of head visible, person turned away, profile view, side view, looking backwards, modern clothing, modern technology","insert_zone":""}',
  'active',
  unixepoch()
);
