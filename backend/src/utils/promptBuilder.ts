import type { Event, GenerateRequest } from '../shared';

interface PromptVariables {
  event: string;
  category: string;
  location: string;
  moment: string;
  clothing: string;
  time_period: string;
  atmosphere: string;
  team_a: string;
  team_b: string;
  score: string;
  mood: string;
  user_team: string;
}

/**
 * Compile an event's generation templates into final prompt strings
 * by replacing placeholders with event data from the nested objects.
 * Optionally accepts user customization (teams, score, mood) for football events.
 */
export function compileEventPrompts(event: Event, game?: GenerateRequest['football']): {
  imagePrompt: string;
  videoPrompt: string;
  captions: string[];
  hashtags: string;
} {
  const vars: PromptVariables = {
    event: event.title,
    category: event.category,
    location: event.scene?.location || '',
    moment: event.title,
    clothing: 'casual wear',
    time_period: event.scene?.time_period || '',
    atmosphere: Array.isArray(event.scene?.atmosphere)
      ? event.scene.atmosphere.join(', ')
      : event.scene?.atmosphere || '',
    team_a: game?.teamA || '',
    team_b: game?.teamB || '',
    score: game?.score || '',
    mood: game?.mood || '',
    user_team: game?.userTeam || game?.teamA || '',
  };

  const promptTemplate = event.generation?.prompt_template || '';

  let imagePrompt = replacePlaceholders(promptTemplate, vars);

  const s = event.scene || {};
  const cam = event.camera || {};
  const enrichSuffix = buildEnrichSuffix(s as Record<string, unknown>, cam as Record<string, unknown>);

  // Build game context once — append to both image and video
  let gameSuffix = '';
  if (game) {
    const parts: string[] = [];
    if (game.teamA && game.teamB) {
      parts.push(`This is a match: ${game.teamA} (home) vs ${game.teamB} (away), current score ${game.score || '0-0'}.`);
      parts.push(`${game.teamA} players wear their home jersey, ${game.teamB} players wear their away jersey. The stadium is filled mostly with ${game.teamA} home fans.`);
    }
    if (game.userTeam || game.teamA) {
      const jerseyTeam = game.userTeam || game.teamA;
      const jerseyType = jerseyTeam === game.teamA ? 'home' : 'away';
      parts.push(`The person is a passionate ${jerseyTeam} supporter, wearing a ${jerseyTeam} ${jerseyType} jersey.`);
    }
    if (game.mood) {
      const positiveMoods = new Set(['euphoria', 'pride', 'awe']);
      const isPositive = positiveMoods.has(game.mood);
      const userTeam = game.userTeam || game.teamA;
      const otherTeam = userTeam === game.teamA ? game.teamB : game.teamA;

      const userMoodDesc: Record<string, string> = {
        euphoria: 'The person is in pure euphoria — face showing ecstatic joy, arms raised high, screaming in celebration, tears streaming.',
        shock: 'The person is in complete shock — face frozen in disbelief, hands on head, mouth wide open, stunned by what just happened.',
        tension: 'The person is tense and anxious — biting nails, hands clasped tight, intense focused expression, barely able to watch.',
        pride: 'The person is overwhelmed with pride — tears of joy rolling down, hand on heart, standing tall with quiet dignity, a single tear falling.',
        nervous: 'The person is extremely nervous — hands over face, peeking through fingers, tense hunched body language, heart racing.',
        awe: 'The person is in awe — eyes wide, mouth slightly open, taking in an impossible moment, speechless in wonder.',
      };
      const desc = userMoodDesc[game.mood];
      if (desc) {
        parts.push(desc);
        if (isPositive) {
          parts.push(`Around them, ${userTeam} fans are going absolutely wild with the same joy — hugging strangers, flags waving, pure ecstasy. Across the stadium, ${otherTeam} fans sit devastated — heads in hands, tears, stunned silence, heartbreak.`);
        } else {
          parts.push(`Around them, ${userTeam} fans share the same anguish — heads in hands, stunned silence, disbelief. Across the stadium, ${otherTeam} fans are celebrating wildly — arms raised, jumping, hugging, pure joy.`);
        }
      }
    }
    if (parts.length > 0) {
      gameSuffix = '\n\n' + parts.join(' ');
      imagePrompt += gameSuffix;
    }
  }

  imagePrompt += enrichSuffix;

  const videoTemplate = event.generation?.video_prompt || promptTemplate;
  const videoPrompt = replacePlaceholders(videoTemplate, vars) + gameSuffix + enrichSuffix;

  return {
    imagePrompt,
    videoPrompt,
    captions: [],
    hashtags: '',
  };
}

export function buildEnrichSuffix(scene: Record<string, unknown>, camera: Record<string, unknown>): string {
  const parts: string[] = [];
  if (scene.type) parts.push(`${scene.type}`);
  if (scene.venue) parts.push(`${scene.venue}`);
  if (scene.lighting) parts.push(`${scene.lighting} lighting`);
  if (scene.weather) parts.push(`${scene.weather} weather`);
  if (scene.crowd_density) parts.push(`${scene.crowd_density} crowd`);
  if (scene.atmosphere) {
    const atm = Array.isArray(scene.atmosphere) ? scene.atmosphere.join(', ') : String(scene.atmosphere);
    parts.push(atm);
  }
  if (camera.angle) parts.push(`${camera.angle} angle`);
  if (camera.shot_type) parts.push(`${camera.shot_type} shot`);
  if (camera.style) parts.push(`${camera.style}`);
  if (camera.lighting) parts.push(`camera: ${camera.lighting}`);
  if (camera.lens) parts.push(`${camera.lens} lens`);
  if (camera.depth_of_field) parts.push(`${camera.depth_of_field} depth of field`);
  return parts.length > 0 ? '\n\n' + parts.join(', ') + '.' : '';
}

function replacePlaceholders(template: string, vars: PromptVariables): string {
  return template
    .replace(/\{event\}/g, vars.event)
    .replace(/\{category\}/g, vars.category)
    .replace(/\{location\}/g, vars.location)
    .replace(/\{moment\}/g, vars.moment)
    .replace(/\{clothing\}/g, vars.clothing)
    .replace(/\{time_period\}/g, vars.time_period)
    .replace(/\{atmosphere\}/g, vars.atmosphere)
    .replace(/\{team_a\}/g, vars.team_a)
    .replace(/\{team_b\}/g, vars.team_b)
    .replace(/\{score\}/g, vars.score)
    .replace(/\{mood\}/g, vars.mood)
    .replace(/\{user_team\}/g, vars.user_team);
}
