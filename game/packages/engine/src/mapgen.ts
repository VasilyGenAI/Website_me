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

function redNumbersAdjacent(tiles: MapTile[]): boolean {
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

/** Checks a (possibly user-made) map for structural problems. Returns a list of errors; empty means valid. */
export function validateMap(map: MapDef): string[] {
  const errors: string[] = [];
  if (map.tiles.length === 0) return ['Map has no tiles'];

  const seen = new Set<string>();
  for (const t of map.tiles) {
    const id = tileId(t.q, t.r);
    if (seen.has(id)) errors.push(`Duplicate tile ${id}`);
    seen.add(id);
    if (t.terrain === 'desert') {
      if (t.number !== null) errors.push(`Desert ${id} must not have a number`);
    } else if (t.number === null || !Number.isInteger(t.number) || t.number < 2 || t.number > 12 || t.number === 7) {
      errors.push(`Tile ${id} needs a number from 2-12 other than 7`);
    }
  }

  // All land must be one connected island so roads can reach everything.
  const start = map.tiles[0];
  const stack = [tileId(start.q, start.r)];
  const reached = new Set(stack);
  while (stack.length) {
    const [q, r] = stack.pop()!.split(',').map(Number);
    for (const [dq, dr] of AXIAL_NEIGHBORS) {
      const n = tileId(q + dq, r + dr);
      if (seen.has(n) && !reached.has(n)) {
        reached.add(n);
        stack.push(n);
      }
    }
  }
  if (reached.size !== seen.size) errors.push('All tiles must be connected');

  const coastal = new Set(topology(map).coastalEdges.map((c) => `${c.q},${c.r},${c.side}`));
  for (const p of map.ports) {
    if (!coastal.has(`${p.q},${p.r},${p.side}`)) errors.push(`Port at ${p.q},${p.r} side ${p.side} is not on the coast`);
  }
  if (!map.tiles.some((t) => t.terrain === 'desert')) errors.push('Map needs a desert for the robber to start on');
  return errors;
}
