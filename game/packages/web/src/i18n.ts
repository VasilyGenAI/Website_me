import type { DevCardType, Resource, Terrain } from '@kontinentalist/engine';

/** German UI strings. Kept in one place so English/Ukrainian can be added later. */
export const RES_NAME: Record<Resource, string> = {
  lumber: 'Holz',
  brick: 'Lehm',
  wool: 'Wolle',
  grain: 'Getreide',
  ore: 'Erz',
};

export const TERRAIN_NAME: Record<Terrain, string> = {
  forest: 'Wald',
  hills: 'Hügel',
  pasture: 'Weide',
  fields: 'Acker',
  mountains: 'Gebirge',
  gold: 'Gold',
  desert: 'Wüste',
  fog: 'Nebel',
};

export const DEV_NAME: Record<DevCardType, string> = {
  knight: 'Ritter',
  roadBuilding: 'Straßenbau',
  yearOfPlenty: 'Erfindung',
  monopoly: 'Monopol',
  victoryPoint: 'Siegpunkt',
};

export const DEV_HELP: Record<DevCardType, string> = {
  knight: 'Räuber versetzen und eine Karte stehlen',
  roadBuilding: 'Zwei Straßen kostenlos bauen',
  yearOfPlenty: 'Zwei Rohstoffe deiner Wahl aus der Bank',
  monopoly: 'Alle Karten eines Rohstoffs von allen Mitspielern',
  victoryPoint: '+1 Siegpunkt (bleibt geheim)',
};

/** Server messages are English; show the common ones in German. */
const ERRORS: Record<string, string> = {
  'It is not your turn': 'Du bist nicht am Zug',
  'Not enough resources': 'Nicht genug Rohstoffe',
  'Roll the dice first': 'Erst würfeln',
  'Roll the dice before ending your turn': 'Erst würfeln, dann Zug beenden',
  'Settlements must be at least two roads apart': 'Siedlungen brauchen zwei Straßen Abstand',
  'Roads must connect to your road or building': 'Straßen müssen an dein Netz anschließen',
  'Only one development card per turn': 'Nur eine Entwicklungskarte pro Zug',
  'Custom boards need a Pro account': 'Eigene Karten brauchen einen Pro-Account',
  'Room not found': 'Raum nicht gefunden',
  'The room is full': 'Der Raum ist voll',
  'Invalid code': 'Ungültiger Code',
  'This code has already been used': 'Dieser Code wurde schon eingelöst',
  'Wrong admin key': 'Falscher Admin-Schlüssel',
  'Admins only': 'Nur für Admins',
};

const MAP_ERRORS: [RegExp, (...m: string[]) => string][] = [
  [/^Map has no tiles$/, () => 'Die Karte hat noch keine Felder'],
  [/^Map has more than (\d+) tiles$/, (n) => `Höchstens ${n} Felder erlaubt`],
  [/^Duplicate tile (.+)$/, (id) => `Feld ${id} doppelt`],
  [/^Tile (.+) is too far from the centre$/, (id) => `Feld ${id} liegt zu weit außen`],
  [/^Tile (.+): needs a number from 2-12 other than 7$/, (id) => `Feld ${id} braucht noch eine Zahl (rot markiert)`],
  [/^Tile (.+): (\w+) must not have a number$/, (id) => `Feld ${id}: Wüste und Nebel haben keine Zahl`],
  [/^Tile (.+): label must be at most 20 characters$/, (id) => `Feld ${id}: Name höchstens 20 Zeichen`],
  [/^Fog pool needs at least (\d+) entries \(has (\d+)\)$/, (need, has) => `Nebel-Vorrat braucht ${need} Einträge (hat ${has})`],
  [/^Port at (.+) side (\d) is not on the coast$/, (id) => `Hafen bei ${id} liegt nicht an der Küste`],
  [/^Two ports on (.+) side (\d)$/, (id) => `Zwei Häfen an derselben Kante bei ${id}`],
];

/** German text for a validateMap() message. */
export function translateMapError(msg: string): string {
  for (const [re, text] of MAP_ERRORS) {
    const m = msg.match(re);
    if (m) return text(...m.slice(1));
  }
  return msg;
}

export function translateError(msg: string): string {
  return ERRORS[msg] ?? msg;
}
