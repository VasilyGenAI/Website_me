import { AXIAL_NEIGHBORS, topology, tileId } from './geometry';
import { shuffle } from './rng';
import type { MapDef, MapPort, MapTile, PortType, Terrain } from './types';

export const STANDARD_TERRAINS: Terrain[] = [
  ...Array<Terrain>(4).fill('forest'),
  ...Array<Terrain>(4).fill('pasture'),
  ...Array<Terrain>(4).fill('fields'),
  ...Array<Terrain>(3).fill('hills'),
  ...Array<Terrain>(3).fill('mountains'),
  'desert',
];

export const STANDARD_NUMBERS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

export const STANDARD_PORTS: PortType[] = ['any', 'any', 'any', 'any', 'lumber', 'brick', 'wool', 'grain', 'ore'];

/** Spacing between port slots along the 30 coastal edges of the standard board. */
const PORT_GAPS = [3, 3, 4, 3, 3, 4, 3, 3, 4];

/** Number of dots under a number token = ways to roll it with two dice. */
export function pips(n: number | null): number {
  return n === null ? 0 : 6 - Math.abs(7 - n);
}

export function hexagonCoords(radius: number): { q: number; r: number }[] {
  const out: { q: number; r: number }[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) out.push({ q, r });
    }
  }
  return out;
}

export function redNumbersAdjacent(tiles: MapTile[]): boolean {
  const byId = new Map(tiles.map((t) => [tileId(t.q, t.r), t]));
  return tiles.some(
    (t) =>
      (t.number === 6 || t.number === 8) &&
      AXIAL_NEIGHBORS.some(([dq, dr]) => {
        const n = byId.get(tileId(t.q + dq, t.r + dr));
        return n !== undefined && (n.number === 6 || n.number === 8);
      }),
  );
}

/** Random standard 19-tile board (3-4 players), with 6s and 8s never touching. */
export function generateStandardMap(seed: number): MapDef {
  const rng = { rng: seed | 0 };
  const coords = hexagonCoords(2);
  const terrains = shuffle(rng, STANDARD_TERRAINS);

  let tiles: MapTile[];
  do {
    const numbers = shuffle(rng, STANDARD_NUMBERS);
    let i = 0;
    tiles = coords.map((c, k) => ({
      q: c.q,
      r: c.r,
      terrain: terrains[k],
      number: terrains[k] === 'desert' ? null : numbers[i++],
    }));
  } while (redNumbersAdjacent(tiles));

  const coast = topology({ name: '', tiles, ports: [] }).coastalEdges;
  const types = shuffle(rng, STANDARD_PORTS);
  const ports: MapPort[] = [];
  let slot = 0;
  types.forEach((type, i) => {
    const c = coast[slot];
    ports.push({ q: c.q, r: c.r, side: c.side, type });
    slot += PORT_GAPS[i];
  });

  return { name: 'Standard', tiles, ports };
}

export const MAX_MAP_RADIUS = 7;
export const MAX_MAP_TILES = 100;

function numberError(id: string, terrain: string, n: number | null): string | null {
  if (terrain === 'desert' || terrain === 'fog') return n === null ? null : `${id}: ${terrain} must not have a number`;
  if (n === null || !Number.isInteger(n) || n < 2 || n > 12 || n === 7) return `${id}: needs a number from 2-12 other than 7`;
  return null;
}

/** Checks a (possibly user-made) map for structural problems. Returns a list of errors; empty means valid. */
export function validateMap(map: MapDef): string[] {
  const errors: string[] = [];
  if (map.tiles.length === 0) return ['Map has no tiles'];
  if (map.tiles.length > MAX_MAP_TILES) errors.push(`Map has more than ${MAX_MAP_TILES} tiles`);

  const seen = new Set<string>();
  for (const t of map.tiles) {
    const id = tileId(t.q, t.r);
    if (seen.has(id)) errors.push(`Duplicate tile ${id}`);
    seen.add(id);
    if (Math.max(Math.abs(t.q), Math.abs(t.r), Math.abs(t.q + t.r)) > MAX_MAP_RADIUS) errors.push(`Tile ${id} is too far from the centre`);
    const err = numberError(`Tile ${id}`, t.terrain, t.number);
    if (err) errors.push(err);
  }

  const fogTiles = map.tiles.filter((t) => t.terrain === 'fog').length;
  const pool = map.fogPool ?? [];
  if (pool.length < fogTiles) errors.push(`Fog pool needs at least ${fogTiles} entries (has ${pool.length})`);
  pool.forEach((f, i) => {
    if ((f.terrain as string) === 'fog') errors.push(`Fog pool entry ${i + 1} cannot be fog`);
    const err = numberError(`Fog pool entry ${i + 1}`, f.terrain, f.number);
    if (err) errors.push(err);
  });

  const coastal = new Set(topology(map).coastalEdges.map((c) => `${c.q},${c.r},${c.side}`));
  const usedEdges = new Set<string>();
  for (const p of map.ports) {
    const key = `${p.q},${p.r},${p.side}`;
    if (!coastal.has(key)) errors.push(`Port at ${p.q},${p.r} side ${p.side} is not on the coast`);
    if (usedEdges.has(key)) errors.push(`Two ports on ${p.q},${p.r} side ${p.side}`);
    usedEdges.add(key);
  }
  return errors;
}
