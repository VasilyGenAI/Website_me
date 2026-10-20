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

export const PRESET_CHOICES: BoardChoice[] = [
  { key: 'p:standard', title: 'Klassisch', subtitle: '19 Felder, jedes Mal neu gemischt', map: generateStandardMap(7), preset: 'standard' },
  { key: 'p:deutschland', title: 'Deutschland', subtitle: 'Küste im Norden, Alpen im Süden · 30 Felder', map: PRESET_MAPS.deutschland(), preset: 'deutschland' },
  { key: 'p:ukraine', title: 'Ukraine', subtitle: 'Karpaten, Steppe, Donbas, Odesa, Krim · 53 Felder', map: PRESET_MAPS.ukraine(), preset: 'ukraine' },
  { key: 'p:nebelwald', title: 'Nebelwald', subtitle: 'Waldring am See, Nebel deckt Neues auf', map: PRESET_MAPS.nebelwald(), preset: 'nebelwald' },
];

export function ownChoice(m: SavedMap): BoardChoice {
  return { key: `o:${m.id}`, title: m.map.name, subtitle: `${m.map.tiles.length} Felder`, map: m.map, custom: m.map };
}

/** Boards allowed in games with people: presets, own published boards, boards others shared. */
export function canPlayWithPeople(m: SavedMap): boolean {
  const s = stage(m);
  return s === 'published' || s === 'shared';
}
