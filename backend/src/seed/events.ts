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

The person is a front-facing spectator, face clearly visible, directly facing the camera, looking out at the field. THE PERSON MUST FACE THE CAMERA with their face fully visible. The person should look genuinely part of this historic moment — same stadium floodlights, same dramatic lighting, same raw intensity as the crowd around them.

Visual style: Ultra-realistic DSLR sports photography, World Cup broadcast aesthetic, shallow depth of field, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on field, back turned, facing away from camera, person facing backwards, back of head visible, person turned away, profile view, side view, looking backwards',
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
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on court, back turned, facing away from camera, person facing backwards, back of head visible, person turned away, profile view, side view, looking backwards',
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
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, back turned, facing away from camera, person facing backwards, back of head visible, person turned away, profile view, side view, looking backwards',
      insert_zone: '',
    },
    status: 'active',
  },
  {
    id: '00000001-0001-4000-8000-000000000004',
    title: 'Three-Body — Witness the Dual-Vector Foil',
    category: 'fiction',
    scene: {
      type: 'spaceship_interior',
      venue: 'Deep Space Observatory Deck',
      location: 'Edge of the Solar System',
      time_period: 'Crisis Era',
      lighting: 'dim_emergency',
      weather: 'none',
      crowd_density: 'alone',
      atmosphere: ['horror', 'despair', 'cosmic_dread', 'silence', 'inevitability'],
      description: 'The dual-vector foil is expanding. Space itself is collapsing into two dimensions. A lone observer watches from a spaceship window, face frozen in terror.',
    },
    camera: {
      style: 'cinematic_photography',
      angle: 'eye_level',
      shot_type: 'medium',
      lens: '35mm',
      depth_of_field: 'shallow',
      lighting: 'eerie_cosmic_glow',
    },
    generation: {
      prompt_template: `Place this person inside a dark spaceship observation deck, standing by a large viewport window. Through the window, reality itself is collapsing — a shimmering, expanding wall of pure light is consuming the starfield, flattening everything into two dimensions. The dual-vector foil is spreading across the solar system.

The person's face is pressed close to the window, expression frozen in horror and despair — mouth slightly open, eyes wide, face pale from the dim emergency lighting. One hand pressed against the glass. They are witnessing the death of three-dimensional space.

The spaceship interior is dark, lit only by the eerie glow from the window and dim red emergency lights. The atmosphere is one of absolute cosmic dread and silence.

The person is facing the window but their face is visible in profile/three-quarter view, illuminated by the otherworldly light from outside. THIS IS A SCENE OF COSMIC HORROR AND DESPAIR.

Visual style: Ultra-realistic cinematic photography, sci-fi film aesthetic, dramatic cosmic lighting, shallow depth of field, 8K, anamorphic lens. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, back turned, facing away from camera, happy, smiling, colorful, bright cheerful scene',
      insert_zone: '',
    },
    status: 'active',
  },
  {
    id: '00000001-0001-4000-8000-000000000005',
    title: 'The Fall of Troy — Trojan Horse',
    category: 'history',
    scene: {
      type: 'ancient_city',
      venue: 'Gates of Troy',
      location: 'Troy, Ancient Greece',
      time_period: '1184 BC',
      lighting: 'night',
      weather: 'clear',
      crowd_density: 'high',
      atmosphere: ['awe', 'treachery', 'fire_glow', 'ancient_world', 'legendary'],
      description: 'The Trojan Horse stands at the gates of Troy. Greek soldiers hidden inside. The city is about to fall.',
    },
    camera: {
      style: 'cinematic_photography',
      angle: 'spectator_view',
      shot_type: 'wide',
      lens: '35mm',
      depth_of_field: 'deep',
      lighting: 'firelight_night',
    },
    generation: {
      prompt_template: `Place this person naturally among the crowd at the gates of ancient Troy. Behind them looms the massive wooden Trojan Horse — an impossibly huge structure, its hollow belly hiding Greek soldiers. Torches flicker in the night, casting dancing shadows on the ancient stone walls.

The person is a Trojan citizen, standing near the horse, face showing a mix of awe and unease — something feels wrong about this "gift." The massive wooden structure towers over the crowd, firelight illuminating its carved surface. The city of Troy in the background, not yet knowing its fate.

The person is facing forward, looking up at the horse, face clearly visible in the torchlight. THE PERSON MUST FACE THE CAMERA with their face fully visible, lit by warm firelight.

Visual style: Ultra-realistic cinematic photography, epic historical film aesthetic, dramatic firelight and torchlight, deep shadows, 8K, anamorphic lens. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, back turned, facing away from camera, person facing backwards, back of head visible, person turned away, profile view, side view, looking backwards, modern clothing, modern technology',
      insert_zone: '',
    },
    status: 'active',
  },
];
