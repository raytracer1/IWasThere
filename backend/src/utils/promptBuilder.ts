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
export function compileEventPrompts(event: Event, football?: GenerateRequest['football']): {
  imagePrompt: string;
  captions: string[];
  hashtags: string;
} {
  const vars: PromptVariables = {
    event: event.title,
    category: event.category,
    location: event.scene?.location || '',
    moment: event.moment?.description || event.moment?.key_action || event.title,
    clothing: event.user?.clothing || 'casual wear',
    time_period: event.scene?.time_period || '',
    atmosphere: Array.isArray(event.scene?.atmosphere)
      ? event.scene.atmosphere.join(', ')
      : event.scene?.atmosphere || '',
    team_a: football?.teamA || '',
    team_b: football?.teamB || '',
    score: football?.score || '',
    mood: football?.mood || '',
    user_team: football?.userTeam || football?.teamA || '',
  };

  const promptTemplate = event.generation?.prompt_template || '';

  let imagePrompt = replacePlaceholders(promptTemplate, vars);

  // If user provided football customization, append it explicitly so it
  // always affects generation even if the template lacks the placeholders.
  if (football) {
    const parts: string[] = [];
    if (football.teamA && football.teamB) {
      parts.push(`This is a football match: ${football.teamA} (home) vs ${football.teamB} (away), current score ${football.score || '0-0'}.`);
      parts.push(`${football.teamA} players wear their home jersey, ${football.teamB} players wear their away jersey. The stadium is filled mostly with ${football.teamA} home fans.`);
    }
    if (football.userTeam || football.teamA) {
      const jerseyTeam = football.userTeam || football.teamA;
      const jerseyType = jerseyTeam === football.teamA ? 'home' : 'away';
      parts.push(`The person is a passionate ${jerseyTeam} supporter, wearing a ${jerseyTeam} ${jerseyType} jersey.`);
    }
    if (football.mood) {
      parts.push(`The person's emotion is ${football.mood}.`);
    }
    if (parts.length > 0) {
      imagePrompt += '\n\n' + parts.join(' ');
    }
  }

  return {
    imagePrompt,
    captions: [],
    hashtags: '',
  };
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
