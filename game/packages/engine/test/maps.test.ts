import { describe, expect, it } from 'vitest';
import { actingPlayers, applyAction, botAction, createGame, fogForestMap, robberTiles, tileId, topology, totalCards, validateMap } from '../src/index';
import type { Action, GameState, MapDef } from '../src/index';

const PLAYERS = ['Ana', 'Ben', 'Cem'].map((name, i) => ({ id: `p${i}`, name, color: `c${i}`, isBot: true }));

function act(state: GameState, player: number, action: Action): GameState {
  const res = applyAction(state, player, action);
  if (!res.ok) throw new Error(res.error);
  return res.state;
}

function playOut(map: MapDef, seed: number): GameState {
  let s = createGame({ seed, players: PLAYERS, map });
  for (let i = 0; i < 20000 && s.phase.type !== 'ended'; i++) {
    const p = actingPlayers(s).find((x) => botAction(s, x))!;
    s = act(s, p, botAction(s, p)!);
  }
  return s;
}

describe('custom maps', () => {
  it('the Nebelwald preset is valid: lake, island, harbours on the lake, fog ring', () => {
    const map = fogForestMap();
    expect(validateMap(map)).toEqual([]);
    expect(map.tiles.filter((t) => t.terrain === 'fog')).toHaveLength(18);
    expect(map.ports.length).toBeGreaterThan(0);
    // The six lake hexes are missing, so the desert island is surrounded by water.
    expect(map.tiles.some((t) => Math.abs(t.q) + Math.abs(t.r) + Math.abs(t.q + t.r) === 2)).toBe(false);
    expect(map.fogPool!.some((f) => f.terrain === 'forest')).toBe(false);
  });

  it('reports fog problems', () => {
    const map = fogForestMap();
    expect(validateMap({ ...map, fogPool: [] })).toContain('Fog pool needs at least 18 entries (has 0)');
    expect(validateMap({ ...map, tiles: [...map.tiles, { q: 9, r: 0, terrain: 'forest', number: 5 }] })).toContain('Tile 9,0 is too far from the centre');
    const p = map.ports[0];
    expect(validateMap({ ...map, ports: [...map.ports, p] })).toContain(`Two ports on ${p.q},${p.r} side ${p.side}`);
  });

  it('a road along a fog tile reveals it and pays the explorer', () => {
    let s = createGame({ seed: 1, players: PLAYERS, map: fogForestMap() });
    const t = topology(s.map);
    const fog = s.map.tiles.find((x) => x.terrain === 'fog')!;
    const id = tileId(fog.q, fog.r);
    // A corner of the fog tile that it shares with the forest ring, and the fog side leading away from it.
    const corner = t.tileVertices[id].find((v) => t.vertexTiles[v].some((x) => s.map.tiles.find((m) => tileId(m.q, m.r) === x)!.terrain !== 'fog'))!;
    const side = t.vertexEdges[corner].find((e) => t.edgeVertices[e].every((v) => t.tileVertices[id].includes(v)))!;
    expect(robberTiles(s)).not.toContain(id);

    s = act(s, 0, { type: 'placeSettlement', vertex: corner });
    const poolBefore = s.fogPool.length;
    s = act(s, 0, { type: 'placeRoad', edge: side });
    expect(s.revealed[id]).toBeDefined();
    expect(s.fogPool.length).toBeLessThan(poolBefore);
    const ev = s.log.find((e) => e.type === 'fogRevealed');
    expect(ev).toMatchObject({ player: 0, tile: id });
    expect(totalCards(s.players[0].resources)).toBeGreaterThanOrEqual(1);
    expect(robberTiles(s)).toContain(id);
  });

  it('bots finish games on Nebelwald and a map without a desert', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const s = playOut(fogForestMap(), seed);
      expect(s.phase.type).toBe('ended');
    }
    const noDesert = fogForestMap();
    noDesert.tiles = noDesert.tiles.map((t) => (t.terrain === 'desert' ? { ...t, terrain: 'fields', number: 6 } : t));
    const s = playOut(noDesert, 3);
    expect(createGame({ seed: 3, players: PLAYERS, map: noDesert }).robber).toBeNull();
    expect(s.phase.type).toBe('ended');
  });
});
