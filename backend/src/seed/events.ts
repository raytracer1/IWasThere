import type { Event } from '../shared';

/**
 * 15 historic sports events for IfIWasThere MVP.
 */
export const SEED_EVENTS: Omit<Event, 'createdAt'>[] = [
  // ─── 1. Messi 2022 World Cup Final ───────────────────────
  {
    id: '7c100f01-01c4-4620-adcb-9ec7def510ff',
    title: 'Messi Trophy Celebration — World Cup Final 2022',
    category: 'sports',
    event_type: 'trophy_celebration',
    scene: {
      type: 'soccer_stadium',
      venue: 'Lusail Stadium',
      location: 'Lusail, Qatar',
      time_period: '2022',
      lighting: 'night',
      weather: 'clear',
      crowd_density: 'very_high',
      atmosphere: ['cheering', 'confetti', 'fireworks', 'flags_waving', 'tears_of_joy'],
      description: 'The greatest World Cup final ever. Messi scores twice, Mbappé hits a hat-trick, and Argentina wins on penalties.',
    },
    emotion: {
      primary: 'euphoria',
      secondary: 'relief',
      intensity: 0.98,
      description: 'Pure joy and tears, arms raised high, the weight of a career fulfilled in one moment',
    },
    camera: {
      style: 'broadcast_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '35mm',
      depth_of_field: 'shallow',
      lighting: 'golden_stadium_floodlights',
    },
    user: {
      role: 'spectator',
      clothing: '2022 Argentina jersey, casual modern wear',
      pose: 'arms_raised',
      expression: 'euphoric',
      visibility: 'high',
    },
    entities: {
      sport: 'soccer',
      competition: 'FIFA World Cup',
      team_a: 'Argentina',
      team_b: 'France',
      player: 'Lionel Messi',
      people: ['Messi', 'Argentine players'],
      objects: ['World Cup trophy', 'confetti', 'fireworks'],
    },
    moment: {
      minute: 120,
      score_before: '3-3',
      score_after: '4-2 (penalties)',
      significance: 'Messi finally wins the World Cup, cementing his legacy as the GOAT',
      description: 'Messi lifting the World Cup trophy, arms raised to the sky, golden confetti raining down',
    },
    generation: {
      prompt_template: `Place this person naturally into the celebration crowd at Lusail Stadium after the 2022 World Cup Final. The person is wearing an Argentina jersey, face showing pure joy and tears, arms raised high. Golden confetti raining down, fireworks in the night sky. Messi just lifted the World Cup trophy.

The crowd around them is ecstatic — hugging strangers, waving Argentine flags, phones out recording history. Stadium floodlights illuminating the pitch, the giant trophy on the podium visible in the background.

The person should look genuinely part of this historic celebration — same warm golden lighting, same emotional intensity.

Visual style: Ultra-realistic DSLR sports photography, ESPN broadcast aesthetic, shallow depth of field, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on field',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },

  // ─── 2. Germany 7-1 Brazil ─────────────────────────────
  {
    id: '95b57720-33a2-47e4-ad79-7dbccc0cc36d',
    title: 'Germany 5th Goal Celebration — World Cup Semi-Final 2014',
    category: 'sports',
    event_type: 'goal_celebration',
    scene: {
      type: 'soccer_stadium',
      venue: 'Mineirão Stadium',
      location: 'Belo Horizonte, Brazil',
      time_period: '2014',
      lighting: 'night',
      weather: 'clear',
      crowd_density: 'very_high',
      atmosphere: ['shocked_celebration', 'stunned_silence', 'contrasting_emotions', 'historic_upset'],
      description: 'The most shocking result in World Cup history. Germany scored 5 goals in 18 first-half minutes against the hosts.',
    },
    emotion: {
      primary: 'shocked_elation',
      secondary: 'disbelief',
      intensity: 0.95,
      description: 'Ecstatic disbelief — laughing in shock, arms raised, surreal atmosphere of witnessing the impossible',
    },
    camera: {
      style: 'broadcast_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '35mm',
      depth_of_field: 'shallow',
      lighting: 'dramatic_stadium',
    },
    user: {
      role: 'spectator',
      clothing: '2014 Germany jersey, casual summer wear',
      pose: 'arms_raised',
      expression: 'shocked',
      visibility: 'high',
    },
    entities: {
      sport: 'soccer',
      competition: 'FIFA World Cup',
      team_a: 'Germany',
      team_b: 'Brazil',
      player: 'Toni Kroos',
      people: ['German players', 'Brazilian fans'],
      objects: ['scoreboard showing GER 7-1 BRA'],
    },
    moment: {
      minute: 29,
      score_before: '4-1',
      score_after: '5-1',
      significance: 'The most shocking result in World Cup history — 5 goals in 18 minutes',
      description: 'German fans celebrating the 5th goal, stunned Brazilian fans in disbelief across the stadium',
    },
    generation: {
      prompt_template: `Place this person naturally into the Germany fan section at Mineirão Stadium during the 2014 World Cup semi-final. The person is wearing a Germany jersey, arms raised, face showing shocked joy and disbelief. Scoreboard visible showing "GER 7 - 1 BRA".

The German fans around are in a state of ecstatic disbelief — some laughing in shock, others singing, flags waving. Brazilian fans visible across the stadium with hands on heads, tears, disbelief. Night atmosphere, stadium lights, dramatic contrast between sections.

The person should look genuinely part of this German celebration — same lighting, same surreal atmosphere, same raw emotion.

Visual style: Ultra-realistic DSLR sports photography, dramatic stadium lighting, emotional crowd shots, shallow depth of field, 8K, Canon 35mm. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on field, empty stadium',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },

  // ─── 3. 1998 World Cup Final ───────────────────────────
  {
    id: 'd9e4810a-b207-4792-87f0-81e6d0c58a1a',
    title: 'Zidane Header — World Cup Final 1998',
    category: 'sports',
    event_type: 'goal_celebration',
    scene: {
      type: 'soccer_stadium',
      venue: 'Stade de France',
      location: 'Paris, France',
      time_period: '1998',
      lighting: 'night',
      weather: 'clear',
      crowd_density: 'very_high',
      atmosphere: ['erupting_celebration', 'confetti', 'national_pride', 'historic_moment'],
      description: 'Zinedine Zidane scored two iconic headers to lead France to a 3-0 victory over Brazil on home soil.',
    },
    emotion: {
      primary: 'euphoria',
      secondary: 'national_pride',
      intensity: 0.92,
      description: 'Pure euphoria, mouth open cheering, arms raised, the joy of an entire nation',
    },
    camera: {
      style: 'broadcast_photography',
      angle: 'crowd_level',
      shot_type: 'medium_wide',
      lens: '35mm',
      depth_of_field: 'shallow',
      lighting: 'stadium_floodlights',
    },
    user: {
      role: 'spectator',
      clothing: 'late 90s France jersey, bucket hat, casual 90s style',
      pose: 'jumping_cheering',
      expression: 'euphoric',
      visibility: 'high',
    },
    entities: {
      sport: 'soccer',
      competition: 'FIFA World Cup',
      team_a: 'France',
      team_b: 'Brazil',
      player: 'Zinedine Zidane',
      people: ['Zidane', 'French players'],
      objects: ['confetti', 'paper streamers', 'French flags'],
    },
    moment: {
      minute: 27,
      score_before: '0-0',
      score_after: '1-0',
      significance: 'Zidane\'s iconic performance leads France to their first World Cup on home soil',
      description: 'Zidane rises above the Brazilian defense, heading the ball into the net — Stade de France erupts',
    },
    generation: {
      prompt_template: `Place this person naturally into the crowd at Stade de France during the 1998 World Cup Final. The person is wearing a late 90s France home jersey, arms raised in the air, face showing pure euphoria, mouth open cheering.

Zidane just scored his first header in the 27th minute. The crowd is exploding — people jumping, hugging strangers, French flags waving everywhere. Confetti and paper streamers in the air. Stadium floodlights blazing down on the pitch. Night atmosphere, dramatic shadows.

The person should look like they are genuinely part of this crowd — same lighting, same color temperature, same emotional intensity.

Visual style: Ultra-realistic DSLR sports photograph, ESPN broadcast aesthetic, shallow depth of field, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on field',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },

  // ─── 4. LeBron's Block 2016 ────────────────────────────
  {
    id: 'e4bebe71-89bb-4024-86bf-57165707e41c',
    title: 'LeBron Chase-Down Block — NBA Finals Game 7 2016',
    category: 'sports',
    event_type: 'defensive_play',
    scene: {
      type: 'basketball_arena',
      venue: 'Oracle Arena',
      location: 'Oakland, California',
      time_period: '2016',
      lighting: 'arena',
      weather: 'indoor',
      crowd_density: 'very_high',
      atmosphere: ['electric_tension', 'split_crowd', 'playoff_intensity', 'historic_implications'],
      description: 'Game 7, tie game, 2 minutes left. LeBron James flies across the court to block Andre Iguodala\'s layup. Cavaliers complete the 3-1 comeback.',
    },
    emotion: {
      primary: 'anticipation',
      secondary: 'explosive_joy',
      intensity: 0.97,
      description: 'Intense anticipation turning to shock and joy, the tension of a tied Game 7 breaking into euphoria',
    },
    camera: {
      style: 'broadcast_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '70mm',
      depth_of_field: 'shallow',
      lighting: 'arena_spotlights',
    },
    user: {
      role: 'spectator',
      clothing: '2016 Cavaliers jersey, wine-and-gold NBA fan gear',
      pose: 'standing_cheering',
      expression: 'shocked',
      visibility: 'high',
    },
    entities: {
      sport: 'basketball',
      competition: 'NBA Finals',
      team_a: 'Cleveland Cavaliers',
      team_b: 'Golden State Warriors',
      player: 'LeBron James',
      people: ['LeBron James', 'Andre Iguodala'],
      objects: ['scoreboard reading Game 7 Q4 1:50', 'basketball', 'NBA Finals logo'],
    },
    moment: {
      minute: 46,
      score_before: '89-89',
      score_after: '89-89',
      significance: 'The Block that defined the Cavaliers 3-1 comeback, Cleveland\'s first championship in 52 years',
      description: 'LeBron flying through the air for the iconic chase-down block on Iguodala',
    },
    generation: {
      prompt_template: `Place this person naturally into the crowd at Oracle Arena during Game 7 of the 2016 NBA Finals. The person is wearing a Cavaliers jersey or wine-and-gold gear, face showing intense anticipation turning to shock and joy. Scoreboard reads "Game 7, Q4 1:50".

LeBron just made The Block on Iguodala. The arena is split — Cavs fans in the crowd are losing their minds, Warriors fans in disbelief. The hardwood floor gleaming under arena lights, the iconic Oracle Arena atmosphere, the tension of a tied Game 7.

The person should look genuinely part of this historic moment — same arena lighting, same raw emotion, same intensity.

Visual style: Ultra-realistic DSLR sports photography, ESPN broadcast aesthetic, NBA Finals atmosphere, dramatic arena lighting, shallow depth of field, 8K. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on court',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },

  // ─── 5. Istanbul 2005 ──────────────────────────────────
  {
    id: 'e5ed7771-c7e7-430d-a101-309e1a40b59e',
    title: 'The Miracle of Istanbul — Champions League Final 2005',
    category: 'sports',
    event_type: 'comeback_celebration',
    scene: {
      type: 'soccer_stadium',
      venue: 'Atatürk Olympic Stadium',
      location: 'Istanbul, Turkey',
      time_period: '2005',
      lighting: 'night',
      weather: 'clear',
      crowd_density: 'very_high',
      atmosphere: ['euphoric_celebration', 'red_flares', 'singing', 'tears_of_joy', 'unbelievable_comeback'],
      description: 'Liverpool came back from 3-0 down at halftime against AC Milan to win on penalties. The greatest comeback in Champions League history.',
    },
    emotion: {
      primary: 'euphoria',
      secondary: 'disbelief',
      intensity: 0.96,
      description: 'Ecstatic joy mixed with utter disbelief, scarf raised above head, tears streaming',
    },
    camera: {
      style: 'broadcast_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '35mm',
      depth_of_field: 'shallow',
      lighting: 'stadium_floodlights',
    },
    user: {
      role: 'spectator',
      clothing: '2005 Liverpool red jersey, mid-2000s casual wear',
      pose: 'scarf_raised',
      expression: 'euphoric',
      visibility: 'high',
    },
    entities: {
      sport: 'soccer',
      competition: 'UEFA Champions League',
      team_a: 'Liverpool',
      team_b: 'AC Milan',
      player: 'Steven Gerrard',
      people: ['Liverpool players'],
      objects: ['Champions League trophy', 'red flares', 'Liverpool scarves'],
    },
    moment: {
      minute: 60,
      score_before: '0-3',
      score_after: '3-3',
      significance: 'The greatest comeback in Champions League history — from 3-0 down to European champions',
      description: 'Liverpool fans celebrating the equalizer, the impossible becoming real at the Atatürk',
    },
    generation: {
      prompt_template: `Place this person naturally into the Liverpool fan section at the Atatürk Olympic Stadium during the 2005 Champions League Final. The person is wearing a 2005 Liverpool red jersey, face showing ecstatic joy mixed with disbelief, scarf raised above head.

Liverpool just completed the comeback from 3-0 down. The crowd is in absolute euphoria — tears, singing "You'll Never Walk Alone", red flares and flags everywhere. Night atmosphere, stadium lights, the Champions League trophy visible in the distance.

The person should look genuinely part of this impossible celebration — same lighting, same tears of joy, same historic intensity.

Visual style: Ultra-realistic DSLR sports photography, Champions League broadcast aesthetic, dramatic stadium lighting, emotional crowd shots, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on field, empty stadium',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },

  // ─── 6. Maradona Goal of the Century ───────────────────
  {
    id: '3d883933-57b3-47ac-81ca-71e3e46bbbaf',
    title: 'Maradona Goal of the Century — World Cup 1986',
    category: 'sports',
    event_type: 'iconic_goal',
    scene: {
      type: 'soccer_stadium',
      venue: 'Estadio Azteca',
      location: 'Mexico City, Mexico',
      time_period: '1986',
      lighting: 'afternoon',
      weather: 'sunny',
      crowd_density: 'very_high',
      atmosphere: ['vintage_atmosphere', 'awe', 'ecstatic_disbelief', 'historic_moment'],
      description: 'Diego Maradona dribbled past five England players from his own half to score the greatest goal in World Cup history.',
    },
    emotion: {
      primary: 'awe',
      secondary: 'ecstatic_joy',
      intensity: 0.94,
      description: 'Absolute awe and joy, hands on heads in disbelief, witnessing the impossible',
    },
    camera: {
      style: 'vintage_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '50mm',
      depth_of_field: 'medium',
      lighting: 'warm_sunlight',
    },
    user: {
      role: 'spectator',
      clothing: '1986 Argentina light blue striped jersey, retro 80s style',
      pose: 'hands_on_head',
      expression: 'awestruck',
      visibility: 'high',
    },
    entities: {
      sport: 'soccer',
      competition: 'FIFA World Cup',
      team_a: 'Argentina',
      team_b: 'England',
      player: 'Diego Maradona',
      people: ['Maradona', 'England defenders'],
      objects: ['blue and white flags'],
    },
    moment: {
      minute: 55,
      score_before: '1-0',
      score_after: '2-0',
      significance: 'The greatest goal in World Cup history — 60 meters, 5 defenders, one immortal dribble',
      description: 'Maradona dribbling past the last defender, about to slot the ball past Shilton',
    },
    generation: {
      prompt_template: `Place this person naturally into the Argentina fan section at Estadio Azteca during the 1986 World Cup quarter-final. The person is wearing a classic 1986 Argentina light blue striped jersey, retro 80s style, face showing absolute awe and joy, arms up in celebration.

Maradona just completed his 60-meter dribble past half the England team. The Argentina fans are in a state of ecstatic disbelief — some with hands on their heads, others jumping and screaming, blue and white flags everywhere. Sunny afternoon, classic Estadio Azteca atmosphere.

The person should look naturally part of this 80s crowd — same warm Mexico sunlight, same vintage stadium feel, same historic emotion.

Visual style: Ultra-realistic 80s sports photography, vintage broadcast aesthetic, warm sunlight, shallow depth of field, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on field',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },

  // ─── 7. Iniesta 2010 ───────────────────────────────────
  {
    id: 'c2ce6d25-ed93-46ab-bb6b-f1fdb1eeea54',
    title: 'Iniesta Extra-Time Winner — World Cup Final 2010',
    category: 'sports',
    event_type: 'winning_goal',
    scene: {
      type: 'soccer_stadium',
      venue: 'Soccer City',
      location: 'Johannesburg, South Africa',
      time_period: '2010',
      lighting: 'night',
      weather: 'clear',
      crowd_density: 'very_high',
      atmosphere: ['vuvuzelas', 'absolute_euphoria', 'tears_of_joy', 'national_pride', 'historic_first'],
      description: 'Andrés Iniesta scored the winning goal in the 116th minute to give Spain their first ever World Cup title.',
    },
    emotion: {
      primary: 'euphoria',
      secondary: 'national_pride',
      intensity: 0.97,
      description: 'Explosive joy, arms stretched wide, screaming in celebration, tears streaming',
    },
    camera: {
      style: 'broadcast_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '35mm',
      depth_of_field: 'shallow',
      lighting: 'warm_night',
    },
    user: {
      role: 'spectator',
      clothing: '2010 Spain red home jersey, vuvuzela, casual summer wear',
      pose: 'arms_wide_open',
      expression: 'euphoric',
      visibility: 'high',
    },
    entities: {
      sport: 'soccer',
      competition: 'FIFA World Cup',
      team_a: 'Spain',
      team_b: 'Netherlands',
      player: 'Andrés Iniesta',
      people: ['Iniesta', 'Spanish players'],
      objects: ['World Cup trophy', 'vuvuzelas', 'red and yellow flags'],
    },
    moment: {
      minute: 116,
      score_before: '0-0',
      score_after: '1-0',
      significance: 'Spain wins their first ever World Cup title — a nation\'s greatest sporting moment',
      description: 'Iniesta\'s volley hitting the net in the 116th minute, the entire Spanish nation erupting as one',
    },
    generation: {
      prompt_template: `Place this person naturally into the Spain fan section at Soccer City during the 2010 World Cup Final. The person is wearing a 2010 Spain red home jersey, face showing explosive joy, arms stretched wide, screaming in celebration.

Iniesta just scored the winner in the 116th minute. Spain fans are in absolute euphoria — hugging strangers, tears streaming, red and yellow flags everywhere. The sound of vuvuzelas in the air. Night atmosphere, stadium lights, the World Cup trophy visible.

The person should look genuinely part of this historic moment — same warm South African night lighting, same raw emotion, same intensity.

Visual style: Ultra-realistic DSLR sports photography, World Cup broadcast aesthetic, dramatic stadium lighting, emotional celebration shots, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on field',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },

  // ─── 8. Bolt Beijing 2008 ──────────────────────────────
  {
    id: '5e7066e4-4bbf-4a3d-81bb-7e849e4c8413',
    title: 'Usain Bolt 100m World Record — Beijing Olympics 2008',
    category: 'sports',
    event_type: 'world_record',
    scene: {
      type: 'athletics_stadium',
      venue: 'Bird\'s Nest Stadium',
      location: 'Beijing, China',
      time_period: '2008',
      lighting: 'night',
      weather: 'clear',
      crowd_density: 'very_high',
      atmosphere: ['electric_energy', 'world_record_fever', 'olympic_spirit', 'cameras_flashing'],
      description: 'Usain Bolt shattered the 100m world record with 9.69 seconds — and celebrated before even crossing the finish line.',
    },
    emotion: {
      primary: 'awe',
      secondary: 'excitement',
      intensity: 0.93,
      description: 'Pure awe and excitement, clapping and cheering at maximum intensity, witnessing human limits being broken',
    },
    camera: {
      style: 'broadcast_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '70mm',
      depth_of_field: 'medium',
      lighting: 'olympic_stadium',
    },
    user: {
      role: 'spectator',
      clothing: '2008 Olympics t-shirt, summer casual wear',
      pose: 'standing_cheering',
      expression: 'awestruck',
      visibility: 'high',
    },
    entities: {
      sport: 'athletics',
      competition: 'Olympic Games',
      team_a: 'Jamaica',
      team_b: '',
      player: 'Usain Bolt',
      people: ['Usain Bolt'],
      objects: ['clock showing 9.69', 'Olympic flame', 'finish line'],
    },
    moment: {
      minute: 0,
      score_before: '',
      score_after: '9.69s',
      significance: 'Fastest man in history — world record while celebrating before the finish line',
      description: 'Bolt crossing the finish line at 9.69, arms spread wide, chest thumping, the clock frozen at an impossible time',
    },
    generation: {
      prompt_template: `Place this person naturally into the roaring crowd at the Bird's Nest Stadium during the Beijing 2008 Olympic 100m final. The person is wearing a 2008 Olympics t-shirt, face showing pure awe and excitement, clapping and cheering at maximum intensity.

Usain Bolt just crossed the finish line at 9.69 — celebrating before he even finished. The clock shows the world record time. The crowd is going absolutely wild — people on their feet, cameras flashing everywhere, the Olympic flame burning in the distance. Night atmosphere under the iconic Bird's Nest architecture.

The person should look genuinely part of this Olympic crowd — same dramatic stadium lighting, same raw emotion, same historic atmosphere.

Visual style: Ultra-realistic DSLR sports photography, Olympic broadcast aesthetic, dramatic stadium lighting, crowd energy, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, athlete on track',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },

  // ─── 9. Man Utd 1999 ───────────────────────────────────
  {
    id: 'd3fe395d-db8b-4bcc-af7b-0385615ee74b',
    title: 'Solskjær Winner — Champions League Final 1999',
    category: 'sports',
    event_type: 'stoppage_time_winner',
    scene: {
      type: 'soccer_stadium',
      venue: 'Camp Nou',
      location: 'Barcelona, Spain',
      time_period: '1999',
      lighting: 'night',
      weather: 'clear',
      crowd_density: 'very_high',
      atmosphere: ['absolute_chaos', 'stoppage_time_madness', 'treble_clinching', 'iconic_moment'],
      description: 'Manchester United scored twice in stoppage time — Solskjær\'s winner completing the Treble. The most dramatic ending ever.',
    },
    emotion: {
      primary: 'ecstatic_shock',
      secondary: 'chaos',
      intensity: 1.0,
      description: 'Absolute bedlam — people falling over seats, tears of joy, screaming, the most dramatic moment in club football',
    },
    camera: {
      style: 'vintage_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '50mm',
      depth_of_field: 'shallow',
      lighting: 'stadium_floodlights',
    },
    user: {
      role: 'spectator',
      clothing: '1999 Manchester United red jersey, late 90s casual wear',
      pose: 'arms_raised',
      expression: 'ecstatic',
      visibility: 'high',
    },
    entities: {
      sport: 'soccer',
      competition: 'UEFA Champions League',
      team_a: 'Manchester United',
      team_b: 'Bayern Munich',
      player: 'Ole Gunnar Solskjær',
      people: ['Solskjær', 'Manchester United players'],
      objects: ['Champions League trophy'],
    },
    moment: {
      minute: 93,
      score_before: '1-1',
      score_after: '2-1',
      significance: 'Completes the Treble — the most dramatic ending in football history, two goals in stoppage time',
      description: 'Solskjær\'s toe-poke winning goal in the 93rd minute, United fans in absolute bedlam at Camp Nou',
    },
    generation: {
      prompt_template: `Place this person naturally into the Man United fan section at Camp Nou during the 1999 Champions League Final. The person is wearing a 1999 Manchester United red jersey, face showing ecstatic shock, arms raised, mouth wide open screaming.

Solskjær just scored the winner in the 93rd minute. United fans are in absolute bedlam — total chaos, people falling over seats, tears of joy, red shirts and scarves everywhere. The Champions League trophy visible on the pitch. Night atmosphere, stadium lights, the iconic "Football, bloody hell" moment.

The person should look genuinely part of this madness — same Camp Nou lighting, same raw disbelief, same historic intensity.

Visual style: Ultra-realistic 90s sports photography, Champions League broadcast aesthetic, dramatic stadium lighting, celebration chaos, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on field',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },

  // ─── 10. Super Bowl XLII Helmet Catch ─────────────────
  {
    id: 'f1f12810-77c7-42ef-9d0b-fffc35d6ab96',
    title: 'The Helmet Catch — Super Bowl XLII 2008',
    category: 'sports',
    event_type: 'iconic_play',
    scene: {
      type: 'nfl_stadium',
      venue: 'University of Phoenix Stadium',
      location: 'Glendale, Arizona',
      time_period: '2008',
      lighting: 'night',
      weather: 'indoor',
      crowd_density: 'very_high',
      atmosphere: ['electric_shock', 'impossible_becoming_possible', 'undefeated_falling', 'super_bowl_intensity'],
      description: 'David Tyree pinned the ball against his helmet on 3rd down, setting up the Giants\' shocking upset of the undefeated 18-0 Patriots.',
    },
    emotion: {
      primary: 'shock',
      secondary: 'disbelief',
      intensity: 0.95,
      description: 'Pure shock and joy, hands on head, the impossible happening right before their eyes',
    },
    camera: {
      style: 'broadcast_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '70mm',
      depth_of_field: 'shallow',
      lighting: 'super_bowl_lighting',
    },
    user: {
      role: 'spectator',
      clothing: '2008 Giants blue jersey, casual NFL fan gear',
      pose: 'hands_on_head',
      expression: 'shocked',
      visibility: 'high',
    },
    entities: {
      sport: 'american_football',
      competition: 'Super Bowl XLII',
      team_a: 'New York Giants',
      team_b: 'New England Patriots',
      player: 'David Tyree',
      people: ['David Tyree', 'Eli Manning'],
      objects: ['football', 'Super Bowl logo', 'confetti ready'],
    },
    moment: {
      minute: 58,
      score_before: '10-14',
      score_after: '10-14',
      significance: 'The greatest Super Bowl upset — the play that broke the undefeated Patriots',
      description: 'David Tyree pinning the football against his helmet, Eli Manning escaping the sack on 3rd down',
    },
    generation: {
      prompt_template: `Place this person naturally into the Giants fan section at the University of Phoenix Stadium during Super Bowl XLII. The person is wearing a 2008 Giants blue jersey, face showing pure shock and joy, hands on head in disbelief.

Tyree just made the Helmet Catch. Giants fans are going absolutely insane — jumping, screaming, crying, blue jerseys everywhere. The stadium is electric with the impossible becoming possible — the undefeated Patriots about to lose. Night atmosphere, Super Bowl lighting, confetti ready.

The person should look genuinely part of this shocking moment — same Super Bowl lighting, same raw disbelief, same historic electricity.

Visual style: Ultra-realistic NFL photography, Super Bowl broadcast aesthetic, dramatic stadium lighting, emotional intensity, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on field',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },

  // ─── 11. Federer vs Nadal 2009 ─────────────────────────
  {
    id: '27417a48-1f85-4a94-875c-537a0249e6da',
    title: 'Federer Wins 16-14 in the 5th — Wimbledon Final 2009',
    category: 'sports',
    event_type: 'championship_point',
    scene: {
      type: 'tennis_court',
      venue: 'Centre Court, Wimbledon',
      location: 'London, England',
      time_period: '2009',
      lighting: 'afternoon',
      weather: 'sunny',
      crowd_density: 'high',
      atmosphere: ['standing_ovation', 'golden_light', 'reverent_awe', 'strawberries_and_cream', 'historic_rivalry'],
      description: 'Often called the greatest match ever played. Federer won 5-7, 7-6, 7-6, 3-6, 16-14 in a 4-hour 48-minute epic.',
    },
    emotion: {
      primary: 'reverence',
      secondary: 'exhausted_joy',
      intensity: 0.90,
      description: 'Exhausted joy and awe, standing and applauding greatness, the entire crowd united in appreciation',
    },
    camera: {
      style: 'sports_photography',
      angle: 'spectator_view',
      shot_type: 'medium',
      lens: '85mm',
      depth_of_field: 'shallow',
      lighting: 'golden_afternoon',
    },
    user: {
      role: 'spectator',
      clothing: 'Wimbledon whites, summer tennis attire, Wimbledon hat',
      pose: 'standing_ovation',
      expression: 'reverent',
      visibility: 'high',
    },
    entities: {
      sport: 'tennis',
      competition: 'Wimbledon',
      team_a: 'Roger Federer',
      team_b: 'Rafael Nadal',
      player: 'Roger Federer',
      people: ['Federer', 'Nadal'],
      objects: ['Wimbledon scoreboard showing 16-14', 'grass court', 'royal box'],
    },
    moment: {
      minute: 288,
      score_before: '15-14 (5th set)',
      score_after: '16-14 (5th set)',
      significance: 'Often called the greatest tennis match ever played — 4 hours 48 minutes of epic battle',
      description: 'Federer falling to his knees after winning match point 16-14 in the 5th set, the crowd rising as one',
    },
    generation: {
      prompt_template: `Place this person naturally into the crowd on Centre Court at Wimbledon during the 2009 final. The person is wearing classic Wimbledon whites / summer tennis attire, face showing exhausted joy and awe, standing and applauding with the entire stadium.

Federer just won 16-14 in the 5th set. The crowd is on its feet giving a standing ovation to both players. The iconic Wimbledon scoreboard shows the epic scoreline. Late afternoon golden light on the grass court, the royal box visible, strawberries and cream atmosphere.

The person should look genuinely part of this historic tennis moment — same warm Wimbledon sunlight, same reverent joy, same historic appreciation.

Visual style: Ultra-realistic sports photography, Wimbledon broadcast aesthetic, golden afternoon light, grass court textures, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on court',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },

  // ─── 12. Dream Team 1992 ───────────────────────────────
  {
    id: 'd452d3db-10b1-4dfd-8fd5-b9914fe97bac',
    title: 'The Dream Team Wins Gold — Barcelona Olympics 1992',
    category: 'sports',
    event_type: 'gold_medal_celebration',
    scene: {
      type: 'basketball_arena',
      venue: 'Palau Municipal d\'Esports',
      location: 'Barcelona, Spain',
      time_period: '1992',
      lighting: 'arena',
      weather: 'indoor',
      crowd_density: 'very_high',
      atmosphere: ['basketball_immortality', 'olympic_spirit', 'awe', 'legendary_team', 'gold_medal_moment'],
      description: 'The first Olympic team with NBA superstars — Jordan, Magic, Bird, Barkley, Pippen. The most dominant team ever assembled, winning gold by an average of 44 points.',
    },
    emotion: {
      primary: 'awe',
      secondary: 'joy',
      intensity: 0.91,
      description: 'Pure joy and awe — not just cheering, but witnessing basketball immortality in person',
    },
    camera: {
      style: 'vintage_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '50mm',
      depth_of_field: 'medium',
      lighting: 'arena_lighting',
    },
    user: {
      role: 'spectator',
      clothing: '1992 USA Basketball Dream Team jersey, retro 90s sportswear',
      pose: 'cheering',
      expression: 'awestruck',
      visibility: 'high',
    },
    entities: {
      sport: 'basketball',
      competition: 'Olympic Games',
      team_a: 'USA Dream Team',
      team_b: 'Croatia',
      player: 'Michael Jordan',
      people: ['Michael Jordan', 'Magic Johnson', 'Larry Bird', 'Charles Barkley', 'Scottie Pippen'],
      objects: ['Olympic rings', 'gold medal', 'USA flag'],
    },
    moment: {
      minute: 0,
      score_before: '',
      score_after: '117-85',
      significance: 'The most dominant basketball team ever assembled — NBA legends together on one Olympic team',
      description: 'Jordan and Magic laughing on the bench as Team USA cruises to gold, the greatest assembly of talent ever',
    },
    generation: {
      prompt_template: `Place this person naturally into the crowd at the 1992 Barcelona Olympics basketball final. The person is wearing a classic 1992 USA Basketball Dream Team jersey, retro 90s style, face showing pure joy and awe, cheering as the Dream Team dominates.

Jordan, Magic, Bird, Barkley all on the court together. The crowd is in awe — not just cheering, but watching basketball immortality. The Olympic rings visible, the gold medal ceremony about to happen. The atmosphere of witnessing the greatest team ever assembled.

The person should look genuinely part of this once-in-a-lifetime moment — same 90s arena lighting, same historic wonder, same joy.

Visual style: Ultra-realistic 90s sports photography, Olympic broadcast aesthetic, arena lighting, vintage basketball atmosphere, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on court',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },

  // ─── 13. Liu Xiang 2004 ────────────────────────────────
  {
    id: 'b2b632a2-d0e5-41f9-860f-f238545a58e3',
    title: 'Liu Xiang 110m Hurdles Gold — Athens Olympics 2004',
    category: 'sports',
    event_type: 'historic_gold_medal',
    scene: {
      type: 'athletics_stadium',
      venue: 'Olympic Stadium',
      location: 'Athens, Greece',
      time_period: '2004',
      lighting: 'evening',
      weather: 'clear',
      crowd_density: 'very_high',
      atmosphere: ['national_pride', 'historic_breakthrough', 'tears_of_joy', 'olympic_spirit', 'flags_waving'],
      description: 'Liu Xiang became the first Asian man to win an Olympic gold in a sprint event, equaling the world record at 12.91 seconds.',
    },
    emotion: {
      primary: 'pride',
      secondary: 'tears_of_joy',
      intensity: 0.94,
      description: 'Tears of pride and joy, the weight of history lifting, an entire continent celebrating',
    },
    camera: {
      style: 'broadcast_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '70mm',
      depth_of_field: 'medium',
      lighting: 'golden_evening',
    },
    user: {
      role: 'spectator',
      clothing: '2004 China Olympic red jacket, summer casual wear',
      pose: 'flag_raised',
      expression: 'tearful_pride',
      visibility: 'high',
    },
    entities: {
      sport: 'athletics',
      competition: 'Olympic Games',
      team_a: 'China',
      team_b: '',
      player: 'Liu Xiang',
      people: ['Liu Xiang'],
      objects: ['Olympic flame', 'scoreboard showing 12.91', 'Chinese flag'],
    },
    moment: {
      minute: 0,
      score_before: '',
      score_after: '12.91s',
      significance: 'First Asian man to win Olympic gold in a sprint event, equaling the world record',
      description: 'Liu Xiang crossing the finish line, seeing the time 12.91, realizing he is Olympic champion — history made',
    },
    generation: {
      prompt_template: `Place this person naturally into the celebrating crowd at the Athens Olympic Stadium during the 2004 110m hurdles final. The person is wearing a 2004 China Olympic red jacket, face showing tears of pride and joy, holding up a Chinese flag.

Liu Xiang just won gold with a world record-tying 12.91 seconds. The Chinese fans in the crowd are crying with pride — flags waving, strangers hugging, the weight of history lifting. The Olympic flame burning in the distance, the scoreboard showing the record time. Warm Athens evening light.

The person should look genuinely part of this historic breakthrough — same golden Olympic lighting, same tears of pride, same moment of history.

Visual style: Ultra-realistic sports photography, Olympic broadcast aesthetic, evening golden light, emotional crowd, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, athlete on track',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },

  // ─── 14. Cricket World Cup 2019 ───────────────────────
  {
    id: 'd9a1fa4c-acb3-4909-8bc8-d27ae8b060dc',
    title: 'Super Over Victory — Cricket World Cup Final 2019',
    category: 'sports',
    event_type: 'dramatic_finish',
    scene: {
      type: 'cricket_ground',
      venue: 'Lord\'s Cricket Ground',
      location: 'London, England',
      time_period: '2019',
      lighting: 'evening',
      weather: 'sunny',
      crowd_density: 'very_high',
      atmosphere: ['tension', 'ecstatic_shock', 'historic_finish', 'summer_evening', 'iconic_venue'],
      description: 'The most dramatic cricket match ever. Tied after 50 overs, tied after the Super Over, England won on boundary countback.',
    },
    emotion: {
      primary: 'tension',
      secondary: 'explosive_joy',
      intensity: 0.98,
      description: 'Absolute tension exploding into ecstatic joy, hands on head in disbelief, the most dramatic finish ever',
    },
    camera: {
      style: 'broadcast_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '70mm',
      depth_of_field: 'medium',
      lighting: 'golden_summer_evening',
    },
    user: {
      role: 'spectator',
      clothing: '2019 England cricket jersey, smart casual summer wear',
      pose: 'hands_on_head',
      expression: 'shocked',
      visibility: 'high',
    },
    entities: {
      sport: 'cricket',
      competition: 'Cricket World Cup',
      team_a: 'England',
      team_b: 'New Zealand',
      player: 'Ben Stokes',
      people: ['England cricket players', 'New Zealand players'],
      objects: ['World Cup trophy', 'Lord\'s pavilion', 'cricket ball'],
    },
    moment: {
      minute: 0,
      score_before: '241-241 (tied)',
      score_after: 'England win on boundary countback',
      significance: 'The most dramatic cricket match ever — tied twice, won on boundary countback at Lord\'s',
      description: 'England players celebrating as the winning run deflects off Stokes\' bat, the crowd at Lord\'s erupting in ecstatic shock',
    },
    generation: {
      prompt_template: `Place this person naturally into the crowd at Lord's during the 2019 Cricket World Cup Final. The person is wearing an England cricket jersey, face showing absolute tension turning into explosive joy, hands on head in disbelief.

England just won on boundary countback after a tied Super Over. The crowd at Lord's is in a state of ecstatic shock — the most dramatic finish in cricket history. The iconic Lord's pavilion in the background, the World Cup trophy being prepared, summer evening light over the ground.

The person should look genuinely part of this cricket madness — same Lord's atmosphere, same raw emotion, same historic electricity.

Visual style: Ultra-realistic sports photography, cricket broadcast aesthetic, golden summer evening light, iconic Lord's atmosphere, cinematic framing, 8K. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on field',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },

  // ─── 15. Götze 2014 World Cup Final ───────────────────
  {
    id: '0965fe85-17cc-45df-9660-00763801187a',
    title: 'Götze Extra-Time Winner — World Cup Final 2014',
    category: 'sports',
    event_type: 'winning_goal',
    scene: {
      type: 'soccer_stadium',
      venue: 'Maracanã Stadium',
      location: 'Rio de Janeiro, Brazil',
      time_period: '2014',
      lighting: 'night',
      weather: 'clear',
      crowd_density: 'very_high',
      atmosphere: ['absolute_delirium', 'tears_flowing', 'world_champions', 'iconic_venue', 'brazilian_night'],
      description: 'Mario Götze controlled the ball on his chest and volleyed into the net in the 113th minute, giving Germany their fourth World Cup over Messi\'s Argentina.',
    },
    emotion: {
      primary: 'euphoria',
      secondary: 'delirium',
      intensity: 0.96,
      description: 'Ecstatic joy, arms raised high, screaming in celebration, the realization of winning the World Cup at the Maracanã',
    },
    camera: {
      style: 'broadcast_photography',
      angle: 'spectator_view',
      shot_type: 'medium_wide',
      lens: '35mm',
      depth_of_field: 'shallow',
      lighting: 'maracanã_night',
    },
    user: {
      role: 'spectator',
      clothing: '2014 Germany white jersey, casual summer wear',
      pose: 'arms_raised',
      expression: 'euphoric',
      visibility: 'high',
    },
    entities: {
      sport: 'soccer',
      competition: 'FIFA World Cup',
      team_a: 'Germany',
      team_b: 'Argentina',
      player: 'Mario Götze',
      people: ['Götze', 'Messi', 'German players'],
      objects: ['World Cup trophy'],
    },
    moment: {
      minute: 113,
      score_before: '0-0',
      score_after: '1-0',
      significance: 'Winning goal gives Germany their fourth World Cup, beating Messi\'s Argentina at the iconic Maracanã',
      description: 'Götze chesting the ball and volleying into the net, the German bench exploding, World Cup glory at the Maracanã',
    },
    generation: {
      prompt_template: `Place this person naturally into the German fan section at the Maracanã during the 2014 World Cup Final. The person is wearing a 2014 Germany white jersey, face showing ecstatic joy, arms raised high, screaming in celebration.

Götze just scored the winner in the 113th minute. German fans are in absolute delirium — tears flowing, flags waving, the realization that they just won the World Cup at the Maracanã. The iconic stadium lit up at night, the World Cup trophy visible, Brazilian sunset fading.

The person should look genuinely part of this triumphant moment — same Maracanã lighting, same raw euphoria, same historic achievement.

Visual style: Ultra-realistic DSLR sports photography, World Cup broadcast aesthetic, dramatic stadium lighting, celebration intensity, cinematic framing, 8K, Canon 35mm. Keep facial features intact. No text or logos.`,
      negative_prompt: 'blurry face, duplicate person, extra fingers, cropped face, distorted body, low quality, cartoon, painting, illustration, watermark, text, logo, player on field',
      background_image: '',
      insert_zone: '',
    },
    status: 'active',
  },
];
