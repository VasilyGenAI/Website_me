import { topology, tileId } from './geometry';
import { RESOURCES, TERRAIN_RESOURCE } from './types';
import type { EdgeId, GameState, MapTile, PortType, Resource, ResourceCounts, Terrain, TileId, VertexId } from './types';

export const COSTS = {
  road: { lumber: 1, brick: 1 },
  settlement: { lumber: 1, brick: 1, wool: 1, grain: 1 },
  city: { grain: 2, ore: 3 },
  devCard: { wool: 1, grain: 1, ore: 1 },
} satisfies Record<string, Partial<ResourceCounts>>;

export function emptyResources(): ResourceCounts {
  return { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 };
}

export function totalCards(r: Partial<ResourceCounts>): number {
  return RESOURCES.reduce((s, k) => s + (r[k] ?? 0), 0);
}

export function hasResources(have: ResourceCounts, need: Partial<ResourceCounts>): boolean {
  return RESOURCES.every((k) => have[k] >= (need[k] ?? 0));
}

export function topo(state: GameState) {
  return topology(state.map);
}

export function mapTile(state: GameState, tile: TileId): MapTile | undefined {
  return state.map.tiles.find((x) => tileId(x.q, x.r) === tile);
}

/** Terrain and number as the players currently know them: fogged tiles read as fog until revealed. */
export function tileInfo(state: GameState, tile: TileId): { terrain: Terrain; number: number | null } | null {
  const revealed = state.revealed[tile];
  if (revealed) return revealed;
  const t = mapTile(state, tile);
  if (!t) return null;
  return t.hidden ? { terrain: 'fog', number: null } : { terrain: t.terrain, number: t.number };
}

export function tileResource(state: GameState, tile: TileId): Resource | null {
  const t = tileInfo(state, tile);
  return t ? TERRAIN_RESOURCE[t.terrain] : null;
}

export function tileNumber(state: GameState, tile: TileId): number | null {
  return tileInfo(state, tile)?.number ?? null;
}

/** Tiles the robber may move to: anything already visible, except where it stands. */
export function robberTiles(state: GameState): TileId[] {
  return topo(state).tiles.filter((x) => x !== state.robber && tileInfo(state, x)?.terrain !== 'fog');
}

/** Distance rule: the vertex and all its neighbours must be free. */
export function isVertexOpen(state: GameState, v: VertexId): boolean {
  const t = topo(state);
  if (!t.vertexTiles[v] || state.buildings[v]) return false;
  return t.vertexNeighbors[v].every((n) => !state.buildings[n]);
}

export function legalSettlementVertices(state: GameState, player: number): VertexId[] {
  const t = topo(state);
  const setup = state.phase.type === 'setup';
  return t.vertices.filter(
    (v) => isVertexOpen(state, v) && (setup || t.vertexEdges[v].some((e) => state.roads[e] === player)),
  );
}

export function legalCityVertices(state: GameState, player: number): VertexId[] {
  return Object.entries(state.buildings)
    .filter(([, b]) => b.owner === player && b.type === 'settlement')
    .map(([v]) => v);
}

/** A road may extend from an own building, or from an own road through a vertex no opponent occupies. */
export function legalRoadEdges(state: GameState, player: number): EdgeId[] {
  const t = topo(state);
  if (state.phase.type === 'setup') {
    const from = state.phase.lastSettlement;
    return from ? t.vertexEdges[from].filter((e) => state.roads[e] === undefined) : [];
  }
  return t.edges.filter((e) => {
    if (state.roads[e] !== undefined) return false;
    return t.edgeVertices[e].some((v) => {
      const b = state.buildings[v];
      if (b) return b.owner === player;
      return t.vertexEdges[v].some((o) => o !== e && state.roads[o] === player);
    });
  });
}

export function playerPorts(state: GameState, player: number): Set<PortType> {
  const t = topo(state);
  const out = new Set<PortType>();
  for (const p of state.map.ports) {
    const cs = t.tileVertices[tileId(p.q, p.r)];
    if (!cs) continue;
    const ends = [cs[p.side], cs[(p.side + 1) % 6]];
    if (ends.some((v) => state.buildings[v]?.owner === player)) out.add(p.type);
  }
  return out;
}

export function tradeRatio(state: GameState, player: number, give: Resource): number {
  const ports = playerPorts(state, player);
  if (ports.has(give)) return 2;
  if (ports.has('any')) return 3;
  return 4;
}

export function robberCandidates(state: GameState, tile: TileId, thief: number): number[] {
  const t = topo(state);
  const out = new Set<number>();
  for (const v of t.tileVertices[tile] ?? []) {
    const b = state.buildings[v];
    if (b && b.owner !== thief && totalCards(state.players[b.owner].resources) > 0) out.add(b.owner);
  }
  return [...out].sort((a, b) => a - b);
}

/** Longest simple trail of a player's roads; opponent buildings cut the road. */
export function longestRoadLength(state: GameState, player: number): number {
  const t = topo(state);
  const mine = Object.keys(state.roads).filter((e) => state.roads[e] === player);
  if (mine.length === 0) return 0;
  let best = 0;
  const used = new Set<EdgeId>();
  const walk = (v: VertexId, len: number) => {
    if (len > best) best = len;
    const b = state.buildings[v];
    if (len > 0 && b && b.owner !== player) return;
    for (const e of t.vertexEdges[v]) {
      if (state.roads[e] !== player || used.has(e)) continue;
      used.add(e);
      const [a, c] = t.edgeVertices[e];
      walk(a === v ? c : a, len + 1);
      used.delete(e);
    }
  };
  const starts = new Set(mine.flatMap((e) => t.edgeVertices[e]));
  for (const v of starts) walk(v, 0);
  return best;
}

export function victoryPoints(state: GameState, player: number, includeHidden = true): number {
  let vp = 0;
  for (const b of Object.values(state.buildings)) {
    if (b.owner === player) vp += b.type === 'city' ? 2 : 1;
  }
  if (state.longestRoad === player) vp += 2;
  if (state.largestArmy === player) vp += 2;
  if (includeHidden) vp += state.players[player].devCards.filter((c) => c.type === 'victoryPoint').length;
  return vp;
}

/** Players who must act right now (several during a discard, otherwise usually just one). */
export function actingPlayers(state: GameState): number[] {
  const p = state.phase;
  if (p.type === 'ended') return [];
  if (p.type === 'discard') return Object.keys(p.pending).map(Number);
  if (state.tradeOffer) {
    const waiting = Object.entries(state.tradeOffer.responses)
      .filter(([, r]) => r === 'pending')
      .map(([k]) => Number(k));
    return [...waiting, state.currentPlayer];
  }
  return [state.currentPlayer];
}
