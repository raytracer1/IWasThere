import type { Event } from '../shared';

interface PromptVariables {
  event: string;
  year: string;
  moment: string;
  era: string;
  location: string;
}

/**
 * Compile an event's prompt templates into final strings
 * by replacing {event}, {year}, {moment}, {era}, {location} placeholders.
 */
export function compileEventPrompts(event: Event): {
  imagePrompt: string;
  captions: string[];
  hashtags: string;
} {
  const vars: PromptVariables = {
    event: event.title,
    year: String(event.year),
    moment: event.keyMoment || event.title,
    era: event.eraClothing || 'casual wear',
    location: event.location || '',
  };

  return {
    imagePrompt: replacePlaceholders(event.imagePrompt, vars),
    captions: parseCaptions(event.captionTemplates).map((t) =>
      replacePlaceholders(t, vars)
    ),
    hashtags: event.hashtags,
  };
}

function replacePlaceholders(template: string, vars: PromptVariables): string {
  return template
    .replace(/\{event\}/g, vars.event)
    .replace(/\{year\}/g, vars.year)
    .replace(/\{moment\}/g, vars.moment)
    .replace(/\{era\}/g, vars.era)
    .replace(/\{location\}/g, vars.location);
}

function parseCaptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
