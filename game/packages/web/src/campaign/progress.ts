import { useSyncExternalStore } from 'react';
import { PRESET_CHOICES } from '../boards';

/*
 * Campaign progress: which countries this player has won, in which size. Kept in the browser
 * for now; with accounts it moves to the server. A country counts as conquered once either
 * size has been won.
 */

export interface Progress {
  won: Record<string, { big?: number; small?: number }>;
}

const KEY = 'kontinentalist.campaign';
const subscribers = new Set<() => void>();
let current: Progress = load();

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    const p = raw ? (JSON.parse(raw) as Progress) : null;
    return p && typeof p.won === 'object' ? p : { won: {} };
  } catch {
    return { won: {} };
  }
}

function save(next: Progress) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private window: progress lasts for this visit */
  }
  for (const fn of subscribers) fn();
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (fn) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    () => current,
  );
}

export const isConquered = (p: Progress, id: string) => !!(p.won[id]?.big || p.won[id]?.small);

/**
 * The country board a finished game was played on, found by name and size (big and small
 * versions share the name). Returns null for the classic board and custom maps.
 */
export function countryOf(mapName: string, tileCount: number): { id: string; size: 'big' | 'small' } | null {
  const c = PRESET_CHOICES.find((x) => x.size && x.title === mapName && x.map.tiles.length === tileCount);
  if (!c?.preset || !c.size) return null;
  return { id: c.preset.replace(/-klein$/, ''), size: c.size };
}

/** Marks a country as won; returns true if it was conquered for the first time. */
export function recordWin(id: string, size: 'big' | 'small'): boolean {
  const first = !isConquered(current, id);
  save({ won: { ...current.won, [id]: { ...current.won[id], [size]: Date.now() } } });
  return first;
}
