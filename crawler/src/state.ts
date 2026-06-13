import fs from 'node:fs';
import path from 'node:path';
import type { CrawlerState } from './types';

const STATE_FILE = path.join(import.meta.dirname, '..', 'data', 'state.json');

function ensureDir() {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadState(): CrawlerState {
  ensureDir();
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { seenUrls: [], lastRun: '' };
  }
}

export function saveState(state: CrawlerState): void {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function markSeen(url: string): void {
  const state = loadState();
  if (!state.seenUrls.includes(url)) {
    state.seenUrls.push(url);
  }
  state.lastRun = new Date().toISOString();
  saveState(state);
}

export function isSeen(url: string): boolean {
  const state = loadState();
  return state.seenUrls.includes(url);
}

/** Limit state file size — keep only last 10000 entries */
export function pruneState(): void {
  const state = loadState();
  if (state.seenUrls.length > 10000) {
    state.seenUrls = state.seenUrls.slice(-5000);
    saveState(state);
  }
}
