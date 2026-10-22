import { describe, expect, it } from 'vitest';
import { AXIAL_NEIGHBORS, PRESET_MAPS, actingPlayers, clusterSizes, generateStandardMap, numberClashes, numberPool, applyAction, botAction, createGame, italyMap, topology, ukraineMap, validateMap } from '../src/index';
import type { GameState, MapDef } from '../src/index';

const { nebelwald: _fog, goldrausch: _gold, ...countries } = PRESET_MAPS;
const COUNTRIES = Object.entries(countries)
  .filter(([id]) => !id.endsWith('-klein'))
  .map(([, make]) => make);
const SMALL = Object.entries(countries)
  .filter(([id]) => id.endsWith('-klein'))
  .map(([, make]) => make);

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
    for (const make of COUNTRIES) {
      const map = make();
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
      expect(map.flag!.colors.length).toBeGreaterThan(1);
      expect(map.tiles.some((t) => t.terrain === 'desert')).toBe(true); // where the flag flies
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

  it('Sicily is joined to Calabria by one bridge; Sardinia is an island of its own', () => {
    const map = italyMap();
    expect(map.bridges).toHaveLength(1);
    const t = topology(map);
    // Land masses when only tile sides count (bridges left out).
    const groups: number[] = [];
    const seen = new Set<string>();
    for (const start of t.tiles) {
      if (seen.has(start)) continue;
      let n = 0;
      const stack = [start];
      while (stack.length) {
        const id = stack.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        n++;
        for (const v of t.tileVertices[id]) for (const x of t.vertexTiles[v]) stack.push(x);
      }
      groups.push(n);
    }
    expect(groups.sort((a, b) => b - a).slice(1)).toEqual([5, 5]); // Sicily and Sardinia
  });

  it('bots finish games on every country board', () => {
    COUNTRIES.forEach((make, i) => expect(playOut(make(), i + 2).phase.type).toBe('ended'));
  }, 120000);
});

describe('fair boards', () => {
  it('no country has a block of more than three equal tiles', () => {
    for (const make of COUNTRIES) {
      const map = make();
      expect(Math.max(...clusterSizes(map.tiles)), map.name).toBeLessThanOrEqual(3);
    }
  });

  it('numbers are dealt afresh every game: never 6 by 8, 2 by 12 or two equal numbers side by side', () => {
    const map = italyMap();
    const a = createGame({ seed: 1, players: PLAYERS, map }).map.tiles.map((t) => t.number);
    const b = createGame({ seed: 2, players: PLAYERS, map }).map.tiles.map((t) => t.number);
    expect(a).not.toEqual(b);
    for (let seed = 1; seed <= 20; seed++) {
      for (const make of [...COUNTRIES, PRESET_MAPS.nebelwald, PRESET_MAPS.goldrausch]) {
        const tiles = createGame({ seed, players: PLAYERS, map: make() }).map.tiles;
        expect(numberClashes(tiles)).toEqual([]);
      }
      expect(numberClashes(generateStandardMap(seed).tiles)).toEqual([]);
    }
  });

  it('big boards get whole doubled sets; a part set prefers likely numbers over 2 and 12', () => {
    const count = (xs: number[], n: number) => xs.filter((x) => x === n).length;
    const big = numberPool(36);
    expect(count(big, 2)).toBe(2);
    expect(count(big, 6)).toBe(4);
    const part = numberPool(15);
    expect(count(part, 2) + count(part, 12)).toBe(0);
    expect(count(part, 6) + count(part, 8)).toBe(4);
  });

  it('every resource gets about the same share of good numbers', () => {
    const map = createGame({ seed: 9, players: PLAYERS, map: PRESET_MAPS.frankreich() }).map;
    const avg = (terrain: string) => {
      const ts = map.tiles.filter((t) => t.terrain === terrain);
      return ts.reduce((s, t) => s + (6 - Math.abs(7 - t.number!)), 0) / ts.length;
    };
    const avgs = ['forest', 'hills', 'pasture', 'fields', 'mountains'].map(avg);
    expect(Math.max(...avgs) - Math.min(...avgs)).toBeLessThan(0.6);
  });
});

describe('Goldrausch', () => {
  it('has gold in the middle, lakes around it, and bots can win on it', () => {
    const map = PRESET_MAPS.goldrausch();
    expect(validateMap(map)).toEqual([]);
    expect(map.tiles.find((t) => t.q === 0 && t.r === 0)!.terrain).toBe('gold');
    expect(map.tiles).toHaveLength(55);
    expect(map.ports).toHaveLength(8);
    expect(playOut(map, 4).phase.type).toBe('ended');
  }, 60000);
});

describe('water names', () => {
  it('sit on water, never on a tile', () => {
    for (const make of [...COUNTRIES, PRESET_MAPS.nebelwald]) {
      const map = make();
      const land = new Set(map.tiles.map((t) => `${t.q},${t.r}`));
      expect(map.waterLabels?.length ?? 0).toBeGreaterThan(0);
      for (const w of map.waterLabels!) expect(land.has(`${w.q},${w.r}`), `${map.name}: ${w.text}`).toBe(false);
      if (map.surroundings) for (const w of map.waterLabels!) expect(map.surroundings.land.includes(`${w.q},${w.r}`), `${map.name}: ${w.text}`).toBe(false);
    }
  });
});

describe('small country boards', () => {
  it('exist for every country, keep at most 21 tiles, and follow the same rules', () => {
    expect(SMALL).toHaveLength(COUNTRIES.length);
    for (const make of SMALL) {
      const map = make();
      expect(validateMap(map), map.name).toEqual([]);
      expect(map.tiles.length, map.name).toBeLessThanOrEqual(21);
      expect(map.tiles.length, map.name).toBeGreaterThanOrEqual(15);
      expect(map.ports, map.name).toHaveLength(8);
      expect(map.ports.filter((p) => p.type === 'any')).toHaveLength(3);
      expect(map.flag).toBeDefined();
      expect(Math.max(...clusterSizes(map.tiles)), map.name).toBeLessThanOrEqual(3);
      for (const t of ['forest', 'hills', 'pasture', 'fields', 'mountains']) expect(map.tiles.some((x) => x.terrain === t), `${map.name} ${t}`).toBe(true);
    }
  });

  it('bots finish games on every small board', () => {
    SMALL.forEach((make, i) => expect(playOut(make(), i + 11).phase.type).toBe('ended'));
  }, 120000);
});
