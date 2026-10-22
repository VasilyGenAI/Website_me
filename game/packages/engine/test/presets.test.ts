import { describe, expect, it } from 'vitest';
import { AXIAL_NEIGHBORS, actingPlayers, applyAction, botAction, createGame, germanyMap, topology, ukraineMap, validateMap } from '../src/index';
import type { GameState, MapDef } from '../src/index';

const PLAYERS = ['Ana', 'Ben', 'Cem', 'Dag'].map((name, i) => ({ id: `p${i}`, name, color: `c${i}`, isBot: true }));

function playOut(map: MapDef, seed: number): GameState {
  let s = createGame({ seed, players: PLAYERS, map });
  for (let i = 0; i < 40000 && s.phase.type !== 'ended'; i++) {
    const p = actingPlayers(s).find((x) => botAction(s, x))!;
    const res = applyAction(s, p, botAction(s, p)!);
    if (!res.ok) throw new Error(res.error);
    s = res.state;
  }
  return s;
}

describe('country boards', () => {
  it('are valid, with every resource and eight trading posts on the right borders', () => {
    for (const map of [germanyMap(), ukraineMap()]) {
      expect(validateMap(map)).toEqual([]);
      for (const t of ['forest', 'hills', 'pasture', 'fields', 'mountains']) expect(map.tiles.some((x) => x.terrain === t)).toBe(true);
      expect(map.ports).toHaveLength(8);
      expect(map.ports.filter((p) => p.type === 'any')).toHaveLength(3);
      expect(new Set(map.ports.filter((p) => p.type !== 'any').map((p) => p.type)).size).toBe(5);
      // Harbours look out to sea, the land posts onto the neighbouring country.
      const sea = new Set(map.surroundings!.sea);
      const abroad = new Set(map.surroundings!.land);
      for (const p of map.ports) {
        const n = AXIAL_NEIGHBORS[p.side];
        expect((p.kind === 'harbor' ? sea : abroad).has(`${p.q + n[0]},${p.r + n[1]}`)).toBe(true);
      }
      expect(map.surroundings!.sea.length).toBeGreaterThan(0);
      expect(map.surroundings!.land.length).toBeGreaterThan(0);
    }
  });

  it('Crimea is an island joined to the mainland by exactly one bridge', () => {
    const map = ukraineMap();
    expect(map.bridges).toHaveLength(1);
    const t = topology(map);
    const [a, b] = map.bridges![0];
    expect(t.vertexNeighbors[a]).toContain(b);
    // Without the bridge the land splits in two; Crimea is the small part with five tiles.
    const seen = new Set<string>();
    const stack = [t.tiles.find((id) => t.tileVertices[id].includes(b))!];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const v of t.tileVertices[id]) for (const n of t.vertexTiles[v]) stack.push(n);
    }
    expect(seen.size).toBe(5);
    expect([...seen].some((id) => map.tiles.find((x) => `${x.q},${x.r}` === id)!.terrain === 'mountains')).toBe(true);
  });

  it('bots finish games on both boards', () => {
    expect(playOut(germanyMap(), 2).phase.type).toBe('ended');
    expect(playOut(ukraineMap(), 3).phase.type).toBe('ended');
  }, 60000);
});
