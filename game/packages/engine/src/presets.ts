import { AXIAL_NEIGHBORS, tileId, topology } from './geometry';
import { STANDARD_NUMBERS, STANDARD_PORTS, hexagonCoords, redNumbersAdjacent } from './mapgen';
import { shuffle } from './rng';
import type { MapDef, MapPort, MapTile, PortType, Terrain } from './types';

const ring = (q: number, r: number) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;

/**
 * "Nebelwald": a forest ring around an inner lake with lumber harbours, a desert island in the
 * middle for the robber, and an outer ring of fog that hides everything except forest.
 */
export function fogForestMap(): MapDef {
  const forestRing: [Terrain, number][] = [
    ['forest', 5], ['forest', 9], ['hills', 10], ['forest', 6], ['forest', 3], ['pasture', 8],
    ['forest', 4], ['forest', 11], ['fields', 9], ['forest', 10], ['forest', 4], ['mountains', 5],
  ];
  // Under the fog: no forest at all, so the outer ring is where brick, wool, grain and ore come from.
  const underFog: [Terrain, number][] = [
    ['hills', 2], ['pasture', 3], ['fields', 4], ['mountains', 5], ['hills', 6], ['pasture', 8],
    ['fields', 9], ['mountains', 10], ['hills', 11], ['pasture', 12], ['fields', 3], ['mountains', 4],
    ['hills', 5], ['pasture', 6], ['fields', 8], ['mountains', 9], ['hills', 10], ['pasture', 11],
  ];
  const tiles: MapTile[] = [{ q: 0, r: 0, terrain: 'desert', number: null }];
  let i = 0;
  let j = 0;
  for (const c of hexagonCoords(3)) {
    if (ring(c.q, c.r) === 2) {
      const [terrain, number] = forestRing[i++];
      tiles.push({ ...c, terrain, number });
    } else if (ring(c.q, c.r) === 3) {
      const [terrain, number] = underFog[j++];
      tiles.push({ ...c, terrain, number, hidden: true });
    }
  }

  // Harbours on the lake shore: six, spread evenly around the lake, alternating lumber and 3:1.
  const land = new Set(tiles.map((t) => tileId(t.q, t.r)));
  const shore: { q: number; r: number; side: number; angle: number }[] = [];
  for (const t of tiles) {
    if (ring(t.q, t.r) !== 2) continue;
    AXIAL_NEIGHBORS.forEach(([dq, dr], side) => {
      const n = { q: t.q + dq, r: t.r + dr };
      if (ring(n.q, n.r) !== 1 || land.has(tileId(n.q, n.r))) return;
      shore.push({ q: t.q, r: t.r, side, angle: Math.atan2(1.5 * n.r, Math.sqrt(3) * (n.q + n.r / 2)) });
    });
  }
  shore.sort((a, b) => a.angle - b.angle);
  const ports: MapPort[] = [0, 1, 2, 3, 4, 5].map((i) => {
    const s = shore[Math.floor((i * shore.length) / 6)];
    return { q: s.q, r: s.r, side: s.side, type: i % 2 ? 'any' : 'lumber' };
  });

  return { name: 'Nebelwald', tiles, ports, fogReward: true };
}

type Land = Exclude<Terrain, 'fog'>;

interface ShapeSpec {
  name: string;
  /** Rows north to south in odd-r offset layout: 'X' is land, anything else is water. */
  rows: string[];
  counts: Record<Land, number>;
  /** Preferred terrains for a cell, best first; row and col are 0..1 across the shape. */
  prefer(row: number, col: number): Land[];
  seed: number;
}

/**
 * Builds a fixed board in the outline of a real place. Terrain follows the region
 * (preferences), numbers are shuffled with a fixed seed so 6 and 8 never touch,
 * and nine harbours are spread evenly along the coast.
 */
function shapeMap(spec: ShapeSpec): MapDef {
  const cells: { q: number; r: number; row: number; col: number }[] = [];
  const height = spec.rows.length;
  const width = Math.max(...spec.rows.map((r) => r.length));
  spec.rows.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      if (ch !== 'X') return;
      const r = row - Math.floor(height / 2);
      const c = col - Math.floor(width / 2);
      cells.push({ q: c - (r - (r & 1)) / 2, r, row: row / Math.max(1, height - 1), col: col / Math.max(1, width - 1) });
    });
  });

  const rng = { rng: spec.seed };
  const left = { ...spec.counts };
  const order = shuffle(rng, cells.map((_, i) => i));
  const terrain: Land[] = Array(cells.length);
  for (const i of order) {
    const want = spec.prefer(cells[i].row, cells[i].col).find((t) => left[t] > 0) ?? (Object.keys(left) as Land[]).find((t) => left[t] > 0)!;
    terrain[i] = want;
    left[want]--;
  }

  const numbered = terrain.filter((t) => t !== 'desert').length;
  let tiles: MapTile[];
  do {
    const numbers = shuffle(rng, Array.from({ length: numbered }, (_, i) => STANDARD_NUMBERS[i % STANDARD_NUMBERS.length]));
    let n = 0;
    tiles = cells.map((c, i) => ({ q: c.q, r: c.r, terrain: terrain[i], number: terrain[i] === 'desert' ? null : numbers[n++] }));
  } while (redNumbersAdjacent(tiles));

  const coast = topology({ name: '', tiles, ports: [] }).coastalEdges;
  const types = shuffle(rng, STANDARD_PORTS);
  const ports: MapPort[] = types.map((type, i) => {
    const c = coast[Math.floor((i * coast.length) / types.length)];
    return { q: c.q, r: c.r, side: c.side, type };
  });
  return { name: spec.name, tiles, ports };
}

/** Germany: coast and pasture in the north, Ruhr hills in the west, Black Forest and Alps in the south. */
export function germanyMap(): MapDef {
  return shapeMap({
    name: 'Deutschland',
    rows: ['..X....', '.XXXX..', '.XXXXX.', 'XXXXXX.', '.XXXXX.', '.XXXXX.', '..XXXX.'],
    counts: { forest: 7, pasture: 6, fields: 6, hills: 5, mountains: 5, desert: 1 },
    prefer(row, col) {
      if (row > 0.9) return ['mountains', 'forest'];
      if (row > 0.75) return col < 0.45 ? ['forest', 'mountains'] : ['mountains', 'fields'];
      if (row < 0.2) return ['pasture', 'fields'];
      if (row < 0.4) return col > 0.4 && col < 0.6 ? ['desert', 'pasture'] : ['fields', 'pasture'];
      return col < 0.4 ? ['hills', 'forest'] : ['forest', 'fields', 'hills'];
    },
    seed: 49,
  });
}

const LETTER: Record<string, Land> = { W: 'forest', H: 'hills', P: 'pasture', A: 'fields', G: 'mountains', D: 'desert' };

interface DrawnSpec {
  name: string;
  /**
   * Rows north to south in odd-r offset layout (odd rows sit half a hex to the right).
   * W Wald, H Hügel, P Weide, A Acker, G Gebirge, D Wüste, anything else is water.
   */
  rows: string[];
  /** Harbours at a cell; the first listed side that faces water is used (0 NE, 1 E, 2 SE, 3 SW, 4 W, 5 NW). */
  ports: { row: number; col: number; type: PortType; sides: number[] }[];
  labels: { row: number; col: number; text: string }[];
  seed: number;
}

/** A hand-drawn board: terrain exactly as drawn, numbers shuffled so 6 and 8 never touch. */
function drawnMap(spec: DrawnSpec): MapDef {
  const width = Math.max(...spec.rows.map((r) => r.length));
  // Keep the row offset even so odd rows stay the shifted ones after centring.
  const rowOffset = Math.floor(spec.rows.length / 4) * 2;
  const colOffset = Math.floor(width / 2);
  const at = (row: number, col: number) => {
    const r = row - rowOffset;
    return { q: col - colOffset - (r - (r & 1)) / 2, r };
  };

  const cells: { q: number; r: number; terrain: Land; label?: string }[] = [];
  spec.rows.forEach((line, row) =>
    [...line].forEach((ch, col) => {
      if (!LETTER[ch]) return;
      const label = spec.labels.find((l) => l.row === row && l.col === col)?.text;
      cells.push({ ...at(row, col), terrain: LETTER[ch], ...(label ? { label } : {}) });
    }),
  );

  const rng = { rng: spec.seed };
  const numbered = cells.filter((c) => c.terrain !== 'desert').length;
  let tiles: MapTile[] = [];
  for (let attempt = 0; ; attempt++) {
    if (attempt > 5000) throw new Error(`${spec.name}: could not place numbers`);
    const numbers = shuffle(rng, Array.from({ length: numbered }, (_, i) => STANDARD_NUMBERS[i % STANDARD_NUMBERS.length]));
    let n = 0;
    tiles = cells.map((c) => ({ ...c, number: c.terrain === 'desert' ? null : numbers[n++] }));
    if (!redNumbersAdjacent(tiles)) break;
  }

  const land = new Set(tiles.map((t) => tileId(t.q, t.r)));
  const ports: MapPort[] = spec.ports.map((p) => {
    const { q, r } = at(p.row, p.col);
    const side = p.sides.find((s) => !land.has(tileId(q + AXIAL_NEIGHBORS[s][0], r + AXIAL_NEIGHBORS[s][1])));
    if (side === undefined || !land.has(tileId(q, r))) throw new Error(`${spec.name}: no coast for port at ${p.row},${p.col}`);
    return { q, r, side, type: p.type };
  });
  return { name: spec.name, tiles, ports };
}

/**
 * Ukraine, drawn after the physical map: Polissia forests in the north, the Carpathians in the
 * west, wheat steppe in the middle, Kryvyi Rih iron and Donbas coal in the east, Odesa with the
 * Budjak strip down to the Danube, the Oleshky sands, and Crimea with all five resources.
 */
export function ukraineMap(): MapDef {
  return drawnMap({
    name: 'Ukraine',
    // Each cell is about 1.8° of longitude by 1° of latitude, placed from real coordinates.
    rows: [
      '.WWWWWA...', //  Wolyn, Riwne, Schytomyr, Polissja, Tschernihiw, Sumy
      'HPWWAPA...', //  Tscherwonohrad, Luzk, Riwne, Schytomyr, Kyjiw, Nischyn, Sumy
      'WHAAAWPAPH', //  Jaworiw, Lwiw, Ternopil, Winnyzja, Bila Zerkwa, Tscherkassy, Poltawa, Charkiw, Kupjansk, Luhansk-Nord
      'GGPAPAHAHG', //  Uschhorod, Iwano-Frankiwsk, Kamjanez, Winnyzja, Uman, Kropywnyzkyj, Dnipro, Pawlohrad, Kramatorsk, Luhansk
      '.GW.PAGHGH', //  Howerla, Czernowitz, (Moldau), Podilsk, Perwomajsk, Krywyj Rih, Saporischschja, Donezk, Donbas
      '....ADAPG.', //  Odesa, Oleschky-Sande, Melitopol, Berdjansk, Mariupol
      '...PA.AH..', //  Ismajil (Donau), Bilhorod, Krim-Nord, Kertsch
      '.....PGW..', //  Sewastopol, Jalta, Sudak
    ],
    ports: [
      { row: 6, col: 3, type: 'wool', sides: [3, 4, 2] }, // Ismajil, Donau (Schafe im Budschak)
      { row: 6, col: 4, type: 'any', sides: [2, 3] }, // Bilhorod-Dnistrowskyj
      { row: 5, col: 4, type: 'grain', sides: [2, 3] }, // Odesa, Getreidehafen
      { row: 7, col: 5, type: 'lumber', sides: [3, 4, 2] }, // Sewastopol
      { row: 7, col: 6, type: 'any', sides: [2, 3] }, // Jalta
      { row: 7, col: 7, type: 'any', sides: [2, 1] }, // Sudak
      { row: 6, col: 7, type: 'brick', sides: [1, 0, 2] }, // Kertsch
      { row: 5, col: 8, type: 'ore', sides: [2, 1, 3] }, // Mariupol, Stahl
      { row: 2, col: 9, type: 'any', sides: [1, 0] }, // Luhansk, Grenzhandel
    ],
    labels: [
      { row: 1, col: 4, text: 'Kyjiw' },
      { row: 2, col: 1, text: 'Lwiw' },
      { row: 2, col: 7, text: 'Charkiw' },
      { row: 3, col: 6, text: 'Dnipro' },
      { row: 4, col: 8, text: 'Donezk' },
      { row: 5, col: 4, text: 'Odesa' },
      { row: 5, col: 8, text: 'Mariupol' },
      { row: 6, col: 3, text: 'Ismajil' },
      { row: 6, col: 6, text: 'Krim' },
      { row: 6, col: 7, text: 'Kertsch' },
      { row: 7, col: 5, text: 'Sewastopol' },
    ],
    seed: 1991,
  });
}

/** Fixed boards anyone can pick. 'standard' is generated fresh for every game. */
export const PRESET_MAPS = {
  deutschland: germanyMap,
  ukraine: ukraineMap,
  nebelwald: fogForestMap,
} as const;
