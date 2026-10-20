import type { MapDef } from '@hexlands/engine';

const KEY = 'hexlands.maps';

/** Saved boards live in the browser for now; they move to the account database with logins. */
export function loadMaps(): MapDef[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveMap(map: MapDef): MapDef[] {
  const maps = loadMaps().filter((m) => m.name !== map.name);
  maps.unshift(map);
  try {
    localStorage.setItem(KEY, JSON.stringify(maps));
  } catch {
    /* storage unavailable: the map simply isn't kept */
  }
  return maps;
}

export function deleteMap(name: string): MapDef[] {
  const maps = loadMaps().filter((m) => m.name !== name);
  try {
    localStorage.setItem(KEY, JSON.stringify(maps));
  } catch {
    /* ignore */
  }
  return maps;
}
