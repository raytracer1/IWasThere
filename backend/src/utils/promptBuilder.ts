import type { Event } from '../shared';

interface PromptVariables {
  event: string;
  category: string;
  location: string;
  moment: string;
  clothing: string;
  time_period: string;
  atmosphere: string;
}

/**
 * Compile an event's generation templates into final prompt strings
 * by replacing placeholders with event data from the nested objects.
 */
export function compileEventPrompts(event: Event): {
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
  };

  const promptTemplate = event.generation?.prompt_template || '';

  return {
    imagePrompt: replacePlaceholders(promptTemplate, vars),
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
    .replace(/\{atmosphere\}/g, vars.atmosphere);
}
