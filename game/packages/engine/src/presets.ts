import { AXIAL_NEIGHBORS, tileId } from './geometry';
import { hexagonCoords } from './mapgen';
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
