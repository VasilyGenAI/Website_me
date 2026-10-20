import { useSyncExternalStore } from 'react';
import type { MapDef } from '@kontinentalist/engine';

/*
 * The player's own boards and game history, kept in this browser until accounts exist.
 *
 * A board moves through stages: draft -> tested (one full game against bots finished)
 * -> published (the owner may use it in games with people) -> shared (everyone sees it
 * under "Custom"). Any edit that changes the board sends it back to draft.
 */

export interface SavedMap {
  id: string;
  map: MapDef;
  /** Hash of the board when its last bot game finished; null if never tested. */
  testedHash: string | null;
  published: boolean;
  shared: boolean;
  plays: number;
  updatedAt: number;
}

export type MapStage = 'draft' | 'tested' | 'published' | 'shared';

export const STAGE_LABEL: Record<MapStage, string> = {
  draft: 'Entwurf',
  tested: 'Getestet',
  published: 'Veröffentlicht',
  shared: 'Für alle freigegeben',
};

export interface GameRecord {
  at: number;
  map: string;
  won: boolean;
  points: number;
  players: number;
  bots: number;
}

const MAPS_KEY = 'kontinentalist.library';
const STATS_KEY = 'kontinentalist.history';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: changes last until the tab closes */
  }
}

let maps: SavedMap[] = read(MAPS_KEY, []);
let history: GameRecord[] = read(STATS_KEY, []);
const subscribers = new Set<() => void>();
let version = 0;

function changed() {
  write(MAPS_KEY, maps);
  write(STATS_KEY, history);
  version++;
  for (const fn of subscribers) fn();
}

/** Re-renders the caller whenever boards or history change. */
export function useLibrary(): { maps: SavedMap[]; history: GameRecord[] } {
  useSyncExternalStore(
    (fn) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    () => version,
  );
  return { maps, history };
}

/** Stable fingerprint of everything that affects play (name excluded). */
export function mapHash(map: MapDef): string {
  const key = JSON.stringify([
    [...map.tiles].sort((a, b) => a.q - b.q || a.r - b.r),
    [...map.ports].sort((a, b) => a.q - b.q || a.r - b.r || a.side - b.side),
    map.fogPool ?? [],
    map.fogReward ?? true,
  ]);
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function stage(m: SavedMap): MapStage {
  if (m.testedHash !== mapHash(m.map)) return 'draft';
  if (m.shared) return 'shared';
  return m.published ? 'published' : 'tested';
}

export function getMap(id: string): SavedMap | undefined {
  return maps.find((m) => m.id === id);
}

/** Saves a board; returns its id. Changing the board itself resets testing and sharing. */
export function saveMap(map: MapDef, id?: string): string {
  const existing = id ? getMap(id) : undefined;
  if (existing) {
    const same = mapHash(existing.map) === mapHash(map);
    Object.assign(existing, {
      map,
      updatedAt: Date.now(),
      ...(same ? {} : { testedHash: null, published: false, shared: false }),
    });
    maps = [...maps];
    changed();
    return existing.id;
  }
  const fresh: SavedMap = {
    id: `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    map,
    testedHash: null,
    published: false,
    shared: false,
    plays: 0,
    updatedAt: Date.now(),
  };
  maps = [fresh, ...maps];
  changed();
  return fresh.id;
}

export function deleteMap(id: string) {
  maps = maps.filter((m) => m.id !== id);
  changed();
}

export function setPublished(id: string, published: boolean) {
  const m = getMap(id);
  if (!m || stage(m) === 'draft') return;
  m.published = published;
  if (!published) m.shared = false;
  maps = [...maps];
  changed();
}

export function setShared(id: string, shared: boolean) {
  const m = getMap(id);
  if (!m || !m.published || stage(m) === 'draft') return;
  m.shared = shared;
  maps = [...maps];
  changed();
}

/** Board being played in the current bot game, so finishing it can count as the test run. */
let testing: string | null = null;

export function startingGameWith(map: MapDef | undefined) {
  testing = map ? mapHash(map) : null;
}

/** Called once when a game ends. */
export function recordGame(record: GameRecord, againstBotsOnly: boolean) {
  history = [record, ...history].slice(0, 200);
  if (testing) {
    for (const m of maps) {
      if (mapHash(m.map) !== testing) continue;
      m.plays++;
      if (againstBotsOnly) m.testedHash = testing;
    }
    maps = [...maps];
  }
  testing = null;
  changed();
}
