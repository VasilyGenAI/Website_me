import { describe, expect, it } from 'vitest';
import { actingPlayers, applyAction, botAction, createGame, fogForestMap, robberTiles, tileId, topology, totalCards, validateMap, viewFor } from '../src/index';
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
    expect(map.tiles.filter((t) => t.hidden)).toHaveLength(24);
    expect(map.ports.length).toBeGreaterThan(0);
    // The six lake hexes are missing, so the desert island is surrounded by water.
    expect(map.tiles.some((t) => Math.abs(t.q) + Math.abs(t.r) + Math.abs(t.q + t.r) === 2)).toBe(false);
    expect(map.tiles.some((t) => t.hidden && t.terrain === 'forest')).toBe(false);
  });

  it('reports fog problems', () => {
    const map = fogForestMap();
    const oldStyle = { ...map, tiles: map.tiles.map((t) => (t.hidden ? { q: t.q, r: t.r, terrain: 'fog' as const, number: null } : t)) };
    expect(validateMap(oldStyle)).toContain('Fog pool needs at least 24 entries (has 0)');
    expect(validateMap({ ...map, tiles: [...map.tiles, { q: 13, r: 0, terrain: 'forest', number: 5 }] })).toContain('Tile 13,0 is too far from the centre');
    const p = map.ports[0];
    expect(validateMap({ ...map, ports: [...map.ports, p] })).toContain(`Two ports on ${p.q},${p.r} side ${p.side}`);
  });

  it('a road along a fog tile reveals exactly the tile under it and pays the explorer', () => {
    let s = createGame({ seed: 1, players: PLAYERS, map: fogForestMap() });
    const t = topology(s.map);
    const fog = s.map.tiles.find((x) => x.hidden)!;
    const id = tileId(fog.q, fog.r);
    // A corner of the fog tile that it shares with the forest ring, and the fog side leading away from it.
    const corner = t.tileVertices[id].find((v) => t.vertexTiles[v].some((x) => !s.map.tiles.find((m) => tileId(m.q, m.r) === x)!.hidden))!;
    const side = t.vertexEdges[corner].find((e) => t.edgeVertices[e].every((v) => t.tileVertices[id].includes(v)))!;
    expect(robberTiles(s)).not.toContain(id);

    expect(viewFor(s, 0).map.tiles.find((x) => tileId(x.q, x.r) === id)).toEqual({ q: fog.q, r: fog.r, terrain: 'fog', number: null });
    s = act(s, 0, { type: 'placeSettlement', vertex: corner });
    s = act(s, 0, { type: 'placeRoad', edge: side });
    expect(s.revealed[id]).toEqual({ terrain: fog.terrain, number: fog.number });
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

describe('gold fields', () => {
  it('a roll on gold lets the owner pick any cards from the bank; bots pick on their own', () => {
    const base = fogForestMap();
    const map: MapDef = { ...base, tiles: base.tiles.map((t) => (t.q === 0 && t.r === 0 ? { ...t, terrain: 'gold' as const, number: 6 } : t)) };
    expect(validateMap(map)).toEqual([]);
    let s = createGame({ seed: 4, players: PLAYERS, map });
    // Skip setup: one settlement for player 0 on the gold island, everyone ready to roll.
    const t = topology(s.map);
    const corner = t.tileVertices['0,0'][0];
    s = { ...s, phase: { type: 'roll' }, currentPlayer: 0, turn: 3, buildings: { [corner]: { owner: 0, type: 'city' } } };
    // Find out what the dice will show, then put that number on the gold field.
    const peek = applyAction(s, 0, { type: 'rollDice' });
    if (!peek.ok) throw new Error(peek.error);
    const sum = peek.state.dice![0] + peek.state.dice![1];
    s = { ...s, map: { ...s.map, tiles: s.map.tiles.map((x) => (x.terrain === 'gold' ? { ...x, number: sum } : x)) } };
    expect(sum).not.toBe(7); // the seed is picked so that it does not roll a 7
    s = act(s, 0, { type: 'rollDice' });
    expect(s.phase).toEqual({ type: 'gold', pending: { 0: 2 } });
    expect(actingPlayers(s)).toEqual([0]);
    expect(applyAction(s, 0, { type: 'chooseGold', resources: { ore: 1 } })).toMatchObject({ ok: false });
    s = act(s, 0, { type: 'chooseGold', resources: { ore: 1, grain: 1 } });
    expect(s.players[0].resources.ore).toBe(1);
    expect(s.players[0].resources.grain).toBe(1);
    expect(s.phase.type).toBe('main');
    expect(s.log.some((e) => e.type === 'goldChosen' && e.player === 0)).toBe(true);
    // A bot in the same spot picks by itself.
    const action = botAction({ ...s, phase: { type: 'gold', pending: { 0: 2 } } }, 0);
    expect(action?.type).toBe('chooseGold');
  });
});
