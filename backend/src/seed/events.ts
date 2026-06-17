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
      prompt_template: `Place this person naturally into the crowd at MetLife Stadium during the 2026 World Cup Final. The scoreboard shows "{team_a} {score} {team_b}". The person is wearing a {user_team} jersey.

The stadium is electric — flags waving, the iconic MetLife Stadium lights cutting through the night. The World Cup trophy visible in the distance.

The person should look genuinely part of this historic moment — same stadium floodlights, same dramatic lighting, same raw intensity as the crowd around them.

Visual style: Ultra-realistic DSLR sports photography, World Cup broadcast aesthetic, shallow depth of field, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on field',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },
];
