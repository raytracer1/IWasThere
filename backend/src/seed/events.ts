import type { Event } from '../shared';

/**
 * 2026 FIFA World Cup seed event.
 * Teams, score, mood, and userTeam are set by the user on the create page.
 * Prompt template uses {team_a}, {team_b}, {score}, {mood}, {user_team} placeholders.
 *
 * promptBuilder appends home/away jersey info and mood automatically.
 */
export const SEED_EVENTS: Omit<Event, 'createdAt'>[] = [
  {
    id: '00000001-0001-4000-8000-000000000001',
    title: 'World Cup Final 2026 — Trophy Celebration',
    category: 'football',
    scene: {
      type: 'soccer_stadium',
      venue: 'MetLife Stadium',
      location: 'East Rutherford, New Jersey',
      time_period: '2026',
      lighting: 'night',
      weather: 'clear',
      crowd_density: 'very_high',
      atmosphere: ['cheering', 'confetti', 'fireworks', 'flags_waving', 'tears_of_joy'],
      description: 'The 2026 World Cup Final at MetLife Stadium.',
    },
    camera: {
      style: 'broadcast_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '35mm',
      depth_of_field: 'shallow',
      lighting: 'stadium_floodlights',
    },
    generation: {
      prompt_template: `Place this person naturally into the crowd at MetLife Stadium during the 2026 World Cup Final. The scoreboard shows "{team_a} {score} {team_b}". The person is facing the camera, looking toward the pitch.

The stadium is electric — flags waving, the iconic MetLife Stadium lights cutting through the night. The World Cup trophy visible in the distance.

The person is a front-facing spectator, face clearly visible, looking out at the field. The person should look genuinely part of this historic moment — same stadium floodlights, same dramatic lighting, same raw intensity as the crowd around them.

Visual style: Ultra-realistic DSLR sports photography, World Cup broadcast aesthetic, shallow depth of field, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on field, back turned, facing away from camera',
      insert_zone: '',
    },
    status: 'active',
  },
  {
    id: '00000001-0001-4000-8000-000000000002',
    title: 'NBA Finals 2026 — Championship Moment',
    category: 'basketball',
    scene: {
      type: 'basketball_arena',
      venue: 'TD Garden',
      location: 'Boston, Massachusetts',
      time_period: '2026',
      lighting: 'arena',
      weather: 'indoor',
      crowd_density: 'very_high',
      atmosphere: ['cheering', 'playoff_intensity', 'championship', 'confetti'],
      description: 'The 2026 NBA Finals. One team will be crowned champions.',
    },
    camera: {
      style: 'broadcast_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '35mm',
      depth_of_field: 'shallow',
      lighting: 'arena_spotlights',
    },
    generation: {
      prompt_template: `Place this person naturally into the crowd at TD Garden during the 2026 NBA Finals. The scoreboard shows "{team_a} {score} {team_b}". The person is facing the camera, looking toward the court.

The arena is electric — playoff intensity, championship on the line. The Larry O'Brien trophy visible courtside.

The person is a front-facing spectator, face clearly visible, looking out at the court. The person should look genuinely part of this historic moment — same arena lighting, same dramatic intensity, same championship atmosphere.

Visual style: Ultra-realistic DSLR sports photography, NBA broadcast aesthetic, shallow depth of field, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on court, back turned, facing away from camera',
      insert_zone: '',
    },
    status: 'active',
  },
  {
    id: '00000001-0001-4000-8000-000000000003',
    title: 'Live Concert — Feel the Music',
    category: 'music',
    scene: {
      type: 'concert_arena',
      venue: 'Wembley Stadium',
      location: 'London, England',
      time_period: '2026',
      lighting: 'night',
      weather: 'clear',
      crowd_density: 'very_high',
      atmosphere: ['cheering', 'singing', 'lights', 'energy', 'music'],
      description: 'A legendary live concert at Wembley Stadium.',
    },
    camera: {
      style: 'concert_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '35mm',
      depth_of_field: 'shallow',
      lighting: 'stage_lights',
    },
    generation: {
      prompt_template: `Place this person naturally into the crowd at a live concert at Wembley Stadium. The stage is lit up with dazzling lights, the band performing in the distance. The person is facing the stage, looking toward the performers.

The crowd around them is electric — hands up, singing along, phone lights waving. Massive screens showing the performers, laser lights cutting through the night sky. Pure live music energy.

The person is a front-facing spectator, face clearly visible, immersed in the music. The person should look genuinely part of this incredible night — same stage lighting, same euphoric atmosphere, same raw emotion.

Visual style: Ultra-realistic concert photography, shallow depth of field, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, back turned, facing away from camera',
      insert_zone: '',
    },
    status: 'active',
  },
];
