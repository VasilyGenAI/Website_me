import type { DevCardType, Resource, Terrain } from '@hexlands/engine';

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
};

export function translateError(msg: string): string {
  return ERRORS[msg] ?? msg;
}
