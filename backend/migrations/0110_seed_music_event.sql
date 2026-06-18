INSERT OR IGNORE INTO events (id, title, category, scene, camera, generation, status, created_at) VALUES (
  '00000001-0001-4000-8000-000000000003',
  'Live Concert — Feel the Music',
  'music',
  '{"type":"concert_arena","venue":"Wembley Stadium","location":"London, England","time_period":"2026","lighting":"night","weather":"clear","crowd_density":"very_high","atmosphere":["cheering","singing","lights","energy","music"],"description":"A legendary live concert at Wembley Stadium."}',
  '{"style":"concert_photography","angle":"spectator_view","shot_type":"medium_wide","lens":"35mm","depth_of_field":"shallow","lighting":"stage_lights"}',
  '{"prompt_template":"Place this person naturally into the crowd at a live concert at Wembley Stadium. The stage is lit up with dazzling lights, the band performing in the distance. The person is facing the stage, looking toward the performers.\n\nThe crowd around them is electric — hands up, singing along, phone lights waving. Massive screens showing the performers, laser lights cutting through the night sky. Pure live music energy.\n\nThe person is a front-facing spectator, face clearly visible, immersed in the music. The person should look genuinely part of this incredible night — same stage lighting, same euphoric atmosphere, same raw emotion.\n\nVisual style: Ultra-realistic concert photography, shallow depth of field, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.","negative_prompt":"blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, back turned, facing away from camera","insert_zone":""}',
  'active',
  unixepoch()
);
