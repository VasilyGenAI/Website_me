import type { EdgeId, MapDef, TileId, VertexId } from './types';

/**
 * Pointy-top hexes on an integer lattice. A hex centre (q, r) sits at x = 2q + r, y = 3r,
 * where x is measured in sqrt(3)/2 and y in 1/2 of the hex size. Corners are then integer
 * points, so neighbouring hexes share vertex ids exactly.
 */
const CORNER_OFFSETS: ReadonlyArray<[number, number]> = [
  [0, -2], // 0 top
  [1, -1], // 1 top-right
  [1, 1], // 2 bottom-right
  [0, 2], // 3 bottom
  [-1, 1], // 4 bottom-left
  [-1, -1], // 5 top-left
];

export const tileId = (q: number, r: number): TileId => `${q},${r}`;

export function parseTileId(id: TileId): { q: number; r: number } {
  const [q, r] = id.split(',').map(Number);
  return { q, r };
}

export function hexCenter(q: number, r: number): { x: number; y: number } {
  return { x: 2 * q + r, y: 3 * r };
}

export function hexCorners(q: number, r: number): VertexId[] {
  const c = hexCenter(q, r);
  return CORNER_OFFSETS.map(([dx, dy]) => `${c.x + dx},${c.y + dy}`);
}

export function edgeKey(a: VertexId, b: VertexId): EdgeId {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function sideEdge(q: number, r: number, side: number): EdgeId {
  const cs = hexCorners(q, r);
  return edgeKey(cs[side], cs[(side + 1) % 6]);
}

/** Vertex position in hex-size units, for rendering (pointy-top, size 1). */
export function vertexPoint(v: VertexId): { x: number; y: number } {
  const [x, y] = v.split(',').map(Number);
  return { x: (x * Math.sqrt(3)) / 2, y: y / 2 };
}

export const AXIAL_NEIGHBORS: ReadonlyArray<[number, number]> = [
  [1, -1],
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
];

export interface Topology {
  tiles: TileId[];
  vertices: VertexId[];
  edges: EdgeId[];
  tileVertices: Record<TileId, VertexId[]>;
  vertexTiles: Record<VertexId, TileId[]>;
  vertexEdges: Record<VertexId, EdgeId[]>;
  vertexNeighbors: Record<VertexId, VertexId[]>;
  edgeVertices: Record<EdgeId, [VertexId, VertexId]>;
  /** Edges that border exactly one land tile, i.e. the coastline. */
  coastalEdges: { edge: EdgeId; q: number; r: number; side: number }[];
}

const byMap = new WeakMap<MapDef, Topology>();
const byLayout = new Map<string, Topology>();

export function topology(map: MapDef): Topology {
  const direct = byMap.get(map);
  if (direct) return direct;
  const key = map.tiles.map((t) => tileId(t.q, t.r)).join(';');
  const hit = byLayout.get(key);
  if (hit) {
    byMap.set(map, hit);
    return hit;
  }

  const t: Topology = {
    tiles: [],
    vertices: [],
    edges: [],
    tileVertices: {},
    vertexTiles: {},
    vertexEdges: {},
    vertexNeighbors: {},
    edgeVertices: {},
    coastalEdges: [],
  };
  const edgeTileCount: Record<EdgeId, { n: number; q: number; r: number; side: number }> = {};

  for (const tile of map.tiles) {
    const id = tileId(tile.q, tile.r);
    const cs = hexCorners(tile.q, tile.r);
    t.tiles.push(id);
    t.tileVertices[id] = cs;
    cs.forEach((v, i) => {
      (t.vertexTiles[v] ??= []).push(id);
      const w = cs[(i + 1) % 6];
      const e = edgeKey(v, w);
      if (!t.edgeVertices[e]) {
        t.edgeVertices[e] = v < w ? [v, w] : [w, v];
        t.edges.push(e);
        (t.vertexEdges[v] ??= []).push(e);
        (t.vertexEdges[w] ??= []).push(e);
        (t.vertexNeighbors[v] ??= []).push(w);
        (t.vertexNeighbors[w] ??= []).push(v);
        edgeTileCount[e] = { n: 0, q: tile.q, r: tile.r, side: i };
      }
      edgeTileCount[e].n++;
    });
  }
  t.vertices = Object.keys(t.vertexTiles);

  // Walk the coastline in angular order so port slots can be spread evenly.
  const coast = Object.entries(edgeTileCount)
    .filter(([, c]) => c.n === 1)
    .map(([edge, c]) => {
      const [a, b] = t.edgeVertices[edge].map(vertexPoint);
      return { edge, q: c.q, r: c.r, side: c.side, angle: Math.atan2((a.y + b.y) / 2, (a.x + b.x) / 2) };
    })
    .sort((a, b) => a.angle - b.angle);
  t.coastalEdges = coast.map(({ edge, q, r, side }) => ({ edge, q, r, side }));

  byLayout.set(key, t);
  byMap.set(map, t);
  return t;
}
