import { AXIAL_NEIGHBORS, tileId, topology } from './geometry';
import { STANDARD_NUMBERS, STANDARD_PORTS, hexagonCoords, redNumbersAdjacent } from './mapgen';
import { shuffle } from './rng';
import type { FogTile, MapDef, MapPort, MapTile, Terrain } from './types';

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
  const tiles: MapTile[] = [{ q: 0, r: 0, terrain: 'desert', number: null }];
  let i = 0;
  for (const c of hexagonCoords(3)) {
    if (ring(c.q, c.r) === 2) {
      const [terrain, number] = forestRing[i++];
      tiles.push({ ...c, terrain, number });
    } else if (ring(c.q, c.r) === 3) {
      tiles.push({ ...c, terrain: 'fog', number: null });
    }
  }

  // Harbours on the lake shore: every other lake-facing side of the forest ring.
  const ports: MapPort[] = [];
  const land = new Set(tiles.map((t) => tileId(t.q, t.r)));
  let k = 0;
  for (const t of tiles) {
    if (ring(t.q, t.r) !== 2) continue;
    AXIAL_NEIGHBORS.forEach(([dq, dr], side) => {
      const n = { q: t.q + dq, r: t.r + dr };
      if (ring(n.q, n.r) !== 1 || land.has(tileId(n.q, n.r))) return;
      if (k++ % 3 === 0) ports.push({ q: t.q, r: t.r, side, type: k % 2 ? 'lumber' : 'any' });
    });
  }

  const numbers = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 3, 4, 5, 6, 8, 9, 10, 11];
  const kinds: FogTile['terrain'][] = ['hills', 'pasture', 'fields', 'mountains'];
  const fogPool: FogTile[] = numbers.map((number, j) => ({ terrain: kinds[j % kinds.length], number }));

  return { name: 'Nebelwald', tiles, ports, fogPool, fogReward: true };
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

/** Ukraine: Polissia forests in the north, Carpathians in the west, wheat steppe, Donbas in the east, Crimea. */
export function ukraineMap(): MapDef {
  return shapeMap({
    name: 'Ukraine',
    rows: ['.XXX.XX.', 'XXXXXXXX', '.XXXXXXX', '..XXXXX.', '....XX..'],
    counts: { fields: 8, forest: 5, pasture: 5, hills: 4, mountains: 4, desert: 1 },
    prefer(row, col) {
      if (row > 0.9) return ['mountains', 'pasture'];
      if (row < 0.2) return ['forest', 'pasture'];
      if (col < 0.2) return ['mountains', 'forest'];
      if (col > 0.8) return ['hills', 'mountains'];
      if (row > 0.6 && col < 0.5) return ['desert', 'fields'];
      return ['fields', 'pasture', 'hills'];
    },
    seed: 380,
  });
}

/** Fixed boards anyone can pick. 'standard' is generated fresh for every game. */
export const PRESET_MAPS = {
  deutschland: germanyMap,
  ukraine: ukraineMap,
  nebelwald: fogForestMap,
} as const;
