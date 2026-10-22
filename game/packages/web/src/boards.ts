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
  /** Country boards come in a big and a small (at most 21 tiles) version. */
  size?: 'big' | 'small';
}

/** Tiles and trading posts, counted from the board itself so the text never goes stale. */
function counts(map: MapDef): string {
  const fog = map.tiles.filter((t) => t.hidden).length;
  return `${map.tiles.length} Felder${fog ? ` (${fog} im Nebel)` : ''} · ${map.ports.length} Tauschstellen`;
}

type Country =
  | 'deutschland'
  | 'ukraine'
  | 'frankreich'
  | 'italien'
  | 'spanien'
  | 'portugal'
  | 'polen'
  | 'niederlande'
  | 'belgien'
  | 'luxemburg'
  | 'liechtenstein'
  | 'tschechien'
  | 'slowakei'
  | 'slowenien'
  | 'ungarn'
  | 'oesterreich'
  | 'schweiz'
  | 'uk'
  | 'irland';

/** A country board in both sizes: its three largest cities, the capital first, then the counts. */
function country(id: Country, capital: string, cities: [string, string]): BoardChoice[] {
  return (['big', 'small'] as const).map((size) => {
    const preset: PresetId = size === 'big' ? id : `${id}-klein`;
    const map = PRESET_MAPS[preset]();
    return { key: `p:${preset}`, title: map.name, subtitle: `${capital} (Hauptstadt), ${cities.join(', ')} · ${counts(map)}`, map, preset, size };
  });
}

const standard = generateStandardMap(7);
const fogForest = PRESET_MAPS.nebelwald();
const goldRush = PRESET_MAPS.goldrausch();

export const PRESET_CHOICES: BoardChoice[] = [
  { key: 'p:standard', title: 'Klassisch', subtitle: `Jedes Mal neu gemischt · ${counts(standard)}`, map: standard, preset: 'standard' },
  ...country('deutschland', 'Berlin', ['Hamburg', 'München']),
  ...country('ukraine', 'Kyjiw', ['Charkiw', 'Odesa']),
  ...country('frankreich', 'Paris', ['Marseille', 'Lyon']),
  ...country('italien', 'Rom', ['Mailand', 'Neapel']),
  ...country('spanien', 'Madrid', ['Barcelona', 'Valencia']),
  ...country('portugal', 'Lissabon', ['Porto', 'Braga']),
  ...country('polen', 'Warschau', ['Krakau', 'Łódź']),
  ...country('niederlande', 'Amsterdam', ['Rotterdam', 'Den Haag']),
  ...country('belgien', 'Brüssel', ['Antwerpen', 'Gent']),
  ...country('luxemburg', 'Luxemburg', ['Esch-sur-Alzette', 'Differdingen']),
  ...country('liechtenstein', 'Vaduz', ['Schaan', 'Triesen']),
  ...country('tschechien', 'Prag', ['Brünn', 'Ostrau']),
  ...country('slowakei', 'Bratislava', ['Košice', 'Prešov']),
  ...country('slowenien', 'Ljubljana', ['Maribor', 'Celje']),
  ...country('ungarn', 'Budapest', ['Debrecen', 'Szeged']),
  ...country('oesterreich', 'Wien', ['Graz', 'Linz']),
  ...country('schweiz', 'Bern', ['Zürich', 'Genf']),
  ...country('uk', 'London', ['Birmingham', 'Glasgow']),
  ...country('irland', 'Dublin', ['Cork', 'Limerick']),
  { key: 'p:nebelwald', title: 'Nebelwald', subtitle: `Waldring am See, Nebel deckt Neues auf · ${counts(fogForest)}`, map: fogForest, preset: 'nebelwald' },
  { key: 'p:goldrausch', title: 'Goldrausch', subtitle: `Gold in der Mitte zahlt jeden Rohstoff · ${counts(goldRush)}`, map: goldRush, preset: 'goldrausch' },
];

/** The same board in the other size, for switching between big and small. */
export function otherSize(key: string): string {
  return key.endsWith('-klein') ? key.slice(0, -'-klein'.length) : PRESET_CHOICES.some((c) => c.key === `${key}-klein`) ? `${key}-klein` : key;
}

export function ownChoice(m: SavedMap): BoardChoice {
  return { key: `o:${m.id}`, title: m.map.name, subtitle: `${m.map.tiles.length} Felder`, map: m.map, custom: m.map };
}

/** Boards allowed in games with people: presets, own published boards, boards others shared. */
export function canPlayWithPeople(m: SavedMap): boolean {
  const s = stage(m);
  return s === 'published' || s === 'shared';
}
