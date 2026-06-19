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
      prompt_template: `Place a person into the celebration crowd, facing the camera directly, face fully visible.
Ultra-realistic World Cup Final at MetLife Stadium, night floodlights, scoreboard showing "{team_a} {score} {team_b}", flags waving, World Cup trophy in the distance, theatrical stadium lighting cutting through the night, shallow depth of field, cinematic framing, 8K, Canon 35mm.
The person wearing a {user_team} jersey, arms raised, expression showing {mood}, same lighting and emotional intensity as the crowd around them.
Original stadium structure, crowd layout, pitch, lighting direction, person's facial features intact.
DSLR sports photography, World Cup broadcast aesthetic. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on field, back turned, facing away from camera, person facing backwards, back of head visible, person turned away, profile view, side view, looking backwards',
      video_prompt: 'Animate the person with subtle cheering motion, arms raising and lowering, confetti falling gently, flags waving in the stadium breeze, crowd swaying in the background, while keeping the face and outfit consistent.',
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
      prompt_template: `Place a person into the crowd, facing the camera directly, face fully visible.
Ultra-realistic NBA Finals at TD Garden, arena spotlights, scoreboard showing "{team_a} {score} {team_b}", playoff intensity, Larry O'Brien trophy visible courtside, shallow depth of field, cinematic framing, 8K, Canon 35mm.
The person wearing a {user_team} jersey, expression showing {mood}, same lighting and championship intensity as the crowd.
Original arena layout, court, crowd structure, lighting, person's facial features intact.
DSLR sports photography, NBA broadcast aesthetic. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on court, back turned, facing away from camera, person facing backwards, back of head visible, person turned away, profile view, side view, looking backwards',
      video_prompt: 'Animate the person with subtle cheering motion, head nodding to the rhythm of the game, crowd swaying behind, arena lights flickering, while keeping the face and outfit consistent.',
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
      prompt_template: `Place a person into the concert crowd, facing the stage, face clearly visible.
Ultra-realistic live concert at Wembley Stadium, dazzling stage lights, band performing, laser lights cutting through the night sky, massive screens, phone lights waving in the crowd, shallow depth of field, cinematic framing, 8K, Canon 35mm.
The person immersed in the music, euphoric expression, same stage lighting and raw energy as the crowd around them.
Original stadium architecture, stage setup, crowd layout, lighting direction, person's facial features intact.
Concert photography, live music aesthetic. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, back turned, facing away from camera, person facing backwards, back of head visible, person turned away, profile view, side view, looking backwards',
      video_prompt: 'Animate the person swaying gently to the music, hair moving, stage lights pulsing and scanning across the crowd, phone lights waving, while keeping the face and outfit consistent.',
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
      prompt_template: `Place a person inside a dark spaceship observation deck, face visible in three-quarter view, illuminated by otherworldly light from outside.
Cinematic sci-fi horror, dark spaceship interior, dim red emergency lights, through the viewport: a shimmering expanding wall of pure light consuming the starfield, the dual-vector foil flattening space into two dimensions, cosmic dread atmosphere, shallow depth of field, 8K, anamorphic lens.
The person's face pressed close to the window, expression frozen in horror and despair, mouth slightly open, eyes wide, face pale, one hand against the glass, witnessing the death of three-dimensional space.
original spaceship interior layout, viewport position, lighting direction, camera framing, person's facial features intact.
Ultra-realistic cinematic photography, sci-fi film aesthetic, dramatic cosmic lighting. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, back turned, facing away from camera, happy, smiling, colorful, bright cheerful scene',
      video_prompt: 'Animate the person with subtle frozen stillness, occasional trembling, the distant expanding light wall shimmering and pulsing, emergency lights flickering softly, while keeping the face and outfit consistent.',
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
      prompt_template: `Place a person among the crowd at the gates of ancient Troy, facing forward, face clearly visible in warm firelight.
Epic historical scene, gates of Troy at night, the massive wooden Trojan Horse towering in the background, torches flickering, dancing shadows on ancient stone walls, deep shadows, dramatic firelight, 8K, anamorphic lens.
The person as a Trojan citizen, face showing awe and unease, looking up at the horse, lit by warm torchlight.
original city gates layout, horse structure and position, torchlight direction, crowd, camera framing, person's facial features intact.
Ultra-realistic cinematic photography, epic historical film aesthetic. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, back turned, facing away from camera, person facing backwards, back of head visible, person turned away, profile view, side view, looking backwards, modern clothing, modern technology',
      video_prompt: 'Animate with torches flickering gently in the night breeze, dancing shadows on stone walls, the person breathing softly with awe, hair moving slightly in the wind, the massive wooden horse looming still behind, while keeping the face and outfit consistent.',
      insert_zone: '',
    },
    status: 'active',
  },
];
