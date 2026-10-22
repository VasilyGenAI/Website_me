import { PRESET_MAPS, generateStandardMap } from '@kontinentalist/engine';
import type { MapDef, PresetId } from '@kontinentalist/engine';
import { stage } from './library';
import type { SavedMap } from './library';

export interface BoardChoice {
  key: string;
  title: string;
  subtitle: string;
  map: MapDef;
  /** What createRoom needs: a preset id, or the board itself. */
  preset?: PresetId;
  custom?: MapDef;
}

/** Tiles and trading posts, counted from the board itself so the text never goes stale. */
function counts(map: MapDef): string {
  const fog = map.tiles.filter((t) => t.hidden).length;
  return `${map.tiles.length} Felder${fog ? ` (${fog} im Nebel)` : ''} · ${map.ports.length} Tauschstellen`;
}

/** A country board: its three largest cities, the capital first, then the counts. */
function country(id: 'deutschland' | 'ukraine', capital: string, cities: [string, string]): BoardChoice {
  const map = PRESET_MAPS[id]();
  return { key: `p:${id}`, title: map.name, subtitle: `${capital} (Hauptstadt), ${cities.join(', ')} · ${counts(map)}`, map, preset: id };
}

const standard = generateStandardMap(7);
const fogForest = PRESET_MAPS.nebelwald();

export const PRESET_CHOICES: BoardChoice[] = [
  { key: 'p:standard', title: 'Klassisch', subtitle: `Jedes Mal neu gemischt · ${counts(standard)}`, map: standard, preset: 'standard' },
  country('deutschland', 'Berlin', ['Hamburg', 'München']),
  country('ukraine', 'Kyjiw', ['Charkiw', 'Odesa']),
  { key: 'p:nebelwald', title: 'Nebelwald', subtitle: `Waldring am See, Nebel deckt Neues auf · ${counts(fogForest)}`, map: fogForest, preset: 'nebelwald' },
];

export function ownChoice(m: SavedMap): BoardChoice {
  return { key: `o:${m.id}`, title: m.map.name, subtitle: `${m.map.tiles.length} Felder`, map: m.map, custom: m.map };
}

/** Boards allowed in games with people: presets, own published boards, boards others shared. */
export function canPlayWithPeople(m: SavedMap): boolean {
  const s = stage(m);
  return s === 'published' || s === 'shared';
}
