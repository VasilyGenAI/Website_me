import { describe, expect, it } from 'vitest';
import {
  AXIAL_NEIGHBORS,
  RESOURCES,
  actingPlayers,
  applyAction,
  botAction,
  createGame,
  generateStandardMap,
  longestRoadLength,
  tileId,
  topology,
  totalCards,
  tradeRatio,
  validateMap,
  victoryPoints,
  viewFor,
} from '../src/index';
import type { Action, GameState, ResourceCounts } from '../src/index';

const PLAYERS = ['Ana', 'Ben', 'Cem', 'Dia'].map((name, i) => ({ id: `p${i}`, name, color: `c${i}` }));

function act(state: GameState, player: number, action: Action): GameState {
  const res = applyAction(state, player, action);
  if (!res.ok) throw new Error(res.error);
  return res.state;
}

function rejects(state: GameState, player: number, action: Action): string {
  const res = applyAction(state, player, action);
  if (res.ok) throw new Error(`expected ${action.type} to be rejected`);
  return res.error;
}

/** Lets bots play until `stop` holds. */
function botsUntil(state: GameState, stop: (s: GameState) => boolean, limit = 5000): GameState {
  for (let i = 0; i < limit && !stop(state); i++) {
    const p = actingPlayers(state).find((x) => botAction(state, x));
    if (p === undefined) throw new Error('stuck');
    state = act(state, p, botAction(state, p)!);
  }
  return state;
}

const afterSetup = (seed = 1) => botsUntil(createGame({ seed, players: PLAYERS }), (s) => s.phase.type !== 'setup');

function hand(partial: Partial<ResourceCounts>): ResourceCounts {
  return { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0, ...partial };
}

/** Gives a player cards taken from the bank, keeping the card total constant. */
function grant(state: GameState, player: number, cards: Partial<ResourceCounts>) {
  for (const r of RESOURCES) {
    state.players[player].resources[r] += cards[r] ?? 0;
    state.bank[r] -= cards[r] ?? 0;
  }
}

/** Searches RNG states for one whose next roll has the wanted sum. */
function rollExactly(state: GameState, sum: number): GameState {
  for (let seed = 0; seed < 10000; seed++) {
    const res = applyAction({ ...state, rng: seed }, state.currentPlayer, { type: 'rollDice' });
    if (res.ok && res.state.dice![0] + res.state.dice![1] === sum) return res.state;
  }
  throw new Error('no seed found');
}

describe('board', () => {
  it('has the standard layout', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const map = generateStandardMap(seed);
      const t = topology(map);
      expect(t.tiles).toHaveLength(19);
      expect(t.vertices).toHaveLength(54);
      expect(t.edges).toHaveLength(72);
      expect(t.coastalEdges).toHaveLength(30);
      expect(map.ports).toHaveLength(9);
      expect(validateMap(map)).toEqual([]);

      const terrains = map.tiles.map((x) => x.terrain).sort();
      expect(terrains.filter((x) => x === 'forest')).toHaveLength(4);
      expect(terrains.filter((x) => x === 'hills')).toHaveLength(3);
      expect(terrains.filter((x) => x === 'desert')).toHaveLength(1);

      const byId = new Map(map.tiles.map((x) => [tileId(x.q, x.r), x]));
      for (const tile of map.tiles) {
        if (tile.number !== 6 && tile.number !== 8) continue;
        for (const [dq, dr] of AXIAL_NEIGHBORS) {
          const n = byId.get(tileId(tile.q + dq, tile.r + dr));
          expect(n?.number === 6 || n?.number === 8).toBe(false);
        }
      }
    }
  });

  it('rejects broken custom maps', () => {
    const map = generateStandardMap(1);
    const first = map.tiles[0];
    expect(validateMap({ ...map, tiles: [...map.tiles, { ...first }] })).toContain(`Duplicate tile ${tileId(first.q, first.r)}`);
    expect(validateMap({ ...map, tiles: map.tiles.map((x) => (x.terrain === 'desert' ? x : { ...x, number: 7 })) }).length).toBeGreaterThan(0);
    expect(validateMap({ ...map, ports: [{ q: 0, r: 0, side: 0, type: 'any' }] })).toEqual(['Port at 0,0 side 0 is not on the coast']);
  });
});

describe('opening', () => {
  it('runs in snake order and pays out the second settlement', () => {
    let s = createGame({ seed: 7, players: PLAYERS });
    const order: number[] = [];
    while (s.phase.type === 'setup') {
      order.push(s.currentPlayer);
      const p = s.currentPlayer;
      s = act(s, p, botAction(s, p)!); // settlement
      s = act(s, p, botAction(s, p)!); // road
    }
    expect(order).toEqual([0, 1, 2, 3, 3, 2, 1, 0]);
    expect(s.phase.type).toBe('roll');
    const t = topology(s.map);
    for (let p = 0; p < 4; p++) {
      const second = s.log.filter((e) => e.type === 'settlementPlaced' && e.player === p)[1];
      const producing = t.vertexTiles[(second as { vertex: string }).vertex].filter((tile) => s.map.tiles.find((x) => tileId(x.q, x.r) === tile)!.terrain !== 'desert');
      expect(totalCards(s.players[p].resources)).toBe(producing.length);
    }
  });

  it('enforces the distance rule and road attachment', () => {
    let s = createGame({ seed: 3, players: PLAYERS });
    const v = topology(s.map).vertices[10];
    s = act(s, 0, { type: 'placeSettlement', vertex: v });
    const far = topology(s.map).edges.find((e) => !e.includes(v))!;
    expect(rejects(s, 0, { type: 'placeRoad', edge: far })).toMatch(/connect/);
    s = act(s, 0, { type: 'placeRoad', edge: topology(s.map).vertexEdges[v][0] });
    const neighbour = topology(s.map).vertexNeighbors[v][0];
    expect(rejects(s, 1, { type: 'placeSettlement', vertex: neighbour })).toMatch(/two roads apart/);
    expect(rejects(s, 0, { type: 'placeSettlement', vertex: topology(s.map).vertices[40] })).toMatch(/not your turn/);
  });
});

describe('turns', () => {
  it('produces resources for settlements and cities, not under the robber', () => {
    for (let seed = 1; seed <= 20; seed++) {
      let s = afterSetup(seed);
      const v = Object.keys(s.buildings).find((x) => s.buildings[x].owner === 1)!;
      s.buildings[v] = { owner: 1, type: 'city' };
      const before = s.players.map((p) => ({ ...p.resources }));
      const rolled = act(s, 0, { type: 'rollDice' });
      const sum = rolled.dice![0] + rolled.dice![1];
      if (sum === 7) continue;
      const t = topology(s.map);
      const expected = before.map((r) => ({ ...r }));
      for (const tile of s.map.tiles) {
        const id = tileId(tile.q, tile.r);
        if (tile.number !== sum || id === s.robber) continue;
        const res = { forest: 'lumber', hills: 'brick', pasture: 'wool', fields: 'grain', mountains: 'ore' }[tile.terrain as string] as keyof ResourceCounts;
        for (const vx of t.tileVertices[id]) {
          const b = s.buildings[vx];
          if (b) expected[b.owner][res] += b.type === 'city' ? 2 : 1;
        }
      }
      expect(rolled.players.map((p) => p.resources)).toEqual(expected);
      expect(rolled.phase.type).toBe('main');
    }
  });

  it('gives nobody a resource the bank cannot cover for everyone', () => {
    let s = afterSetup(2);
    const sum = 8;
    const t = topology(s.map);
    const tile = s.map.tiles.find((x) => x.number === sum)!;
    const id = tileId(tile.q, tile.r);
    // Two different players sit on the tile, the bank only has one card.
    const [a, , c] = t.tileVertices[id];
    s.buildings = { ...s.buildings, [a]: { owner: 1, type: 'settlement' }, [c]: { owner: 2, type: 'settlement' } };
    const res = { forest: 'lumber', hills: 'brick', pasture: 'wool', fields: 'grain', mountains: 'ore' }[tile.terrain as string] as keyof ResourceCounts;
    const spare = s.bank[res] - 1;
    s.bank[res] = 1;
    s.players[3].resources[res] += spare;
    const rolled = rollExactly(s, sum);
    expect(rolled.players[1].resources[res]).toBe(s.players[1].resources[res]);
    expect(rolled.players[2].resources[res]).toBe(s.players[2].resources[res]);
    expect(rolled.log.some((e) => e.type === 'productionBlocked' && e.resource === res)).toBe(true);
  });

  it('handles a 7: discard half, move the robber, steal', () => {
    let s = afterSetup(4);
    for (const p of s.players) p.resources = hand({});
    s.bank = hand({ lumber: 19, brick: 19, wool: 19, grain: 19, ore: 19 });
    grant(s, 1, { lumber: 5, ore: 4 }); // 9 cards -> discard 4
    grant(s, 2, { wool: 7 }); // 7 cards -> safe
    s = rollExactly(s, 7);
    expect(s.phase).toEqual({ type: 'discard', pending: { 1: 4 } });
    expect(rejects(s, 0, { type: 'moveRobber', tile: '0,0' })).toMatch(/discard/);
    expect(rejects(s, 1, { type: 'discard', resources: { lumber: 3 } })).toMatch(/exactly 4/);
    s = act(s, 1, { type: 'discard', resources: { lumber: 2, ore: 2 } });
    expect(totalCards(s.players[1].resources)).toBe(5);
    expect(s.phase).toEqual({ type: 'robber', then: 'main' });
    expect(rejects(s, 0, { type: 'moveRobber', tile: s.robber! })).toMatch(/different/);

    // Put the robber next to player 1 so there is someone to steal from.
    const t = topology(s.map);
    const target = t.tiles.find((x) => x !== s.robber && t.tileVertices[x].some((v) => s.buildings[v]?.owner === 1) && !t.tileVertices[x].some((v) => s.buildings[v]?.owner === 2))!;
    s = act(s, 0, { type: 'moveRobber', tile: target });
    expect(s.robber).toBe(target);
    expect(totalCards(s.players[1].resources)).toBe(4);
    expect(totalCards(s.players[0].resources)).toBe(1);
    expect(s.phase.type).toBe('main');
  });

  it('requires rolling before building or ending the turn', () => {
    const s = afterSetup(5);
    expect(rejects(s, 0, { type: 'endTurn' })).toMatch(/Roll/);
    expect(rejects(s, 0, { type: 'buyDevCard' })).toMatch(/Roll/);
  });
});

describe('building and scoring', () => {
  it('awards and breaks the longest road', () => {
    let s = afterSetup(6);
    s = rollExactly(s, 6);
    s.phase = { type: 'main' };
    grant(s, 0, { lumber: 8, brick: 8 });
    // Extend player 0's network until it reaches 5.
    while (longestRoadLength(s, 0) < 5) {
      const before = longestRoadLength(s, 0);
      const t = topology(s.map);
      const options = Object.keys(t.edgeVertices).filter((e) => applyAction(s, 0, { type: 'placeRoad', edge: e }).ok);
      const edge = options.find((e) => {
        const r = applyAction(s, 0, { type: 'placeRoad', edge: e });
        return r.ok && longestRoadLength(r.state, 0) > before;
      })!;
      s = act(s, 0, { type: 'placeRoad', edge });
    }
    expect(s.longestRoad).toBe(0);
    expect(victoryPoints(s, 0)).toBe(4);

    // An opponent settlement in the middle of the road takes the bonus away.
    const t = topology(s.map);
    const mid = t.vertices.find((v) => {
      if (s.buildings[v] || t.vertexNeighbors[v].some((n) => s.buildings[n])) return false;
      const trial = structuredClone(s);
      trial.buildings[v] = { owner: 1, type: 'settlement' };
      return longestRoadLength(trial, 0) < 5;
    });
    if (mid) {
      s.currentPlayer = 1;
      for (const e of t.vertexEdges[mid]) if (s.roads[e] === undefined) s.roads[e] = 1;
      grant(s, 1, { lumber: 1, brick: 1, wool: 1, grain: 1 });
      s = act(s, 1, { type: 'placeSettlement', vertex: mid });
      expect(s.longestRoad).not.toBe(0);
    }
  });

  it('turns a settlement into a city and keeps piece counts', () => {
    let s = rollExactly(afterSetup(8), 6);
    s.phase = { type: 'main' };
    grant(s, 0, { grain: 2, ore: 3 });
    const v = Object.keys(s.buildings).find((x) => s.buildings[x].owner === 0)!;
    s = act(s, 0, { type: 'placeCity', vertex: v });
    expect(s.buildings[v].type).toBe('city');
    expect(s.players[0].citiesLeft).toBe(3);
    expect(s.players[0].settlementsLeft).toBe(4);
    expect(victoryPoints(s, 0)).toBe(3);
  });

  it('uses port ratios for bank trades', () => {
    let s = rollExactly(afterSetup(9), 6);
    s.phase = { type: 'main' };
    for (const p of s.players) p.resources = hand({});
    s.bank = hand({ lumber: 19, brick: 19, wool: 19, grain: 19, ore: 19 });
    grant(s, 0, { wool: 4 });
    const ratio = tradeRatio(s, 0, 'wool');
    s = act(s, 0, { type: 'bankTrade', give: 'wool', get: 'ore' });
    expect(s.players[0].resources).toEqual(hand({ wool: 4 - ratio, ore: 1 }));
    expect(rejects(s, 0, { type: 'bankTrade', give: 'ore', get: 'ore' })).toMatch(/different/);
  });
});

describe('development cards', () => {
  it('cannot be played the turn they are bought, and only one per turn', () => {
    let s = rollExactly(afterSetup(10), 6);
    s.phase = { type: 'main' };
    s.devDeck = ['knight', 'knight', 'monopoly'];
    grant(s, 0, { wool: 2, grain: 2, ore: 2 });
    s = act(s, 0, { type: 'buyDevCard' });
    expect(s.players[0].devCards).toEqual([{ type: 'monopoly', boughtOnTurn: s.turn }]);
    expect(rejects(s, 0, { type: 'playMonopoly', resource: 'ore' })).toMatch(/bought this turn/);

    s.players[0].devCards.push({ type: 'knight', boughtOnTurn: 0 }, { type: 'yearOfPlenty', boughtOnTurn: 0 });
    s = act(s, 0, { type: 'playYearOfPlenty', resources: ['brick', 'brick'] });
    expect(rejects(s, 0, { type: 'playKnight' })).toMatch(/one development card/);
  });

  it('allows a knight before rolling and returns to the roll', () => {
    const s0 = afterSetup(11);
    s0.players[0].devCards.push({ type: 'knight', boughtOnTurn: 0 });
    let s = act(s0, 0, { type: 'playKnight' });
    expect(s.phase).toEqual({ type: 'robber', then: 'roll' });
    const t = topology(s.map);
    const empty = t.tiles.find((x) => x !== s.robber && t.tileVertices[x].every((v) => !s.buildings[v]))!;
    s = act(s, 0, { type: 'moveRobber', tile: empty });
    expect(s.phase.type).toBe('roll');
  });

  it('gives largest army at three knights', () => {
    let s = afterSetup(12);
    s.players[0].knightsPlayed = 2;
    s.players[0].devCards.push({ type: 'knight', boughtOnTurn: 0 });
    s = act(s, 0, { type: 'playKnight' });
    expect(s.largestArmy).toBe(0);
  });

  it('monopoly collects every card of one type', () => {
    let s = rollExactly(afterSetup(13), 6);
    s.phase = { type: 'main' };
    const total = s.players.reduce((n, p) => n + p.resources.wool, 0);
    s.players[0].devCards.push({ type: 'monopoly', boughtOnTurn: 0 });
    s = act(s, 0, { type: 'playMonopoly', resource: 'wool' });
    expect(s.players[0].resources.wool).toBe(total);
    expect(s.players.slice(1).every((p) => p.resources.wool === 0)).toBe(true);
  });

  it('hidden victory point cards win the game on your own turn', () => {
    let s = rollExactly(afterSetup(14), 6);
    s.phase = { type: 'main' };
    s.players[1].devCards = Array.from({ length: 8 }, () => ({ type: 'victoryPoint' as const, boughtOnTurn: 0 }));
    grant(s, 0, { ore: 4 });
    s = act(s, 0, { type: 'bankTrade', give: 'ore', get: 'wool' }); // player 1 has 10 points, but it is player 0's turn...
    expect(s.phase.type).toBe('main');
    // Before that, only player 1 sees the cards; the others see the public points.
    expect(viewFor(s, 1).players[1].victoryCards).toBe(8);
    expect(viewFor(s, 0).players[1].victoryCards).toBeNull();
    expect(viewFor(s, 0).players[1].points).toBe(victoryPoints(s, 1, false));
    s = act(s, 0, { type: 'endTurn' }); // ...so they win the moment their own turn starts
    expect(s.phase).toEqual({ type: 'ended', winner: 1 });
    // At the end everyone sees them.
    expect(viewFor(s, 0).players[1].victoryCards).toBe(8);
    expect(viewFor(s, 0).players[1].points).toBe(victoryPoints(s, 1));
  });
});

describe('player trades', () => {
  it('offer, accept, confirm', () => {
    let s = rollExactly(afterSetup(15), 6);
    s.phase = { type: 'main' };
    for (const p of s.players) p.resources = hand({});
    s.bank = hand({ lumber: 19, brick: 19, wool: 19, grain: 19, ore: 19 });
    grant(s, 0, { lumber: 2 });
    grant(s, 2, { ore: 1 });
    expect(rejects(s, 0, { type: 'offerTrade', give: { lumber: 1 }, want: { lumber: 1 } })).toMatch(/same resource/);
    s = act(s, 0, { type: 'offerTrade', give: { lumber: 2 }, want: { ore: 1 } });
    expect(rejects(s, 1, { type: 'respondTrade', accept: true })).toMatch(/requested cards/);
    s = act(s, 2, { type: 'respondTrade', accept: true });
    expect(rejects(s, 0, { type: 'confirmTrade', with: 1 })).toMatch(/not accepted/);
    s = act(s, 0, { type: 'confirmTrade', with: 2 });
    expect(s.players[0].resources).toEqual(hand({ ore: 1 }));
    expect(s.players[2].resources).toEqual(hand({ lumber: 2 }));
    expect(s.tradeOffer).toBeNull();
  });
});

describe('bot games', () => {
  it('finish and conserve every card and piece', () => {
    for (let seed = 100; seed < 130; seed++) {
      let s = createGame({ seed, players: PLAYERS.map((p) => ({ ...p, isBot: true })) });
      let steps = 0;
      while (s.phase.type !== 'ended') {
        const p = actingPlayers(s).find((x) => botAction(s, x))!;
        s = act(s, p, botAction(s, p)!);
        steps++;
        if (steps % 25 !== 0) continue;
        for (const r of RESOURCES) expect(s.bank[r] + s.players.reduce((n, pl) => n + pl.resources[r], 0)).toBe(19);
        const dev = s.devDeck.length + s.players.reduce((n, pl) => n + pl.devCards.length + pl.knightsPlayed, 0);
        expect(dev).toBeLessThanOrEqual(25);
        s.players.forEach((pl, i) => {
          const mine = Object.values(s.buildings).filter((b) => b.owner === i);
          expect(mine.filter((b) => b.type === 'settlement').length + pl.settlementsLeft).toBe(5);
          expect(mine.filter((b) => b.type === 'city').length + pl.citiesLeft).toBe(4);
          expect(Object.values(s.roads).filter((o) => o === i).length + pl.roadsLeft).toBe(15);
        });
      }
      expect(victoryPoints(s, s.phase.winner)).toBeGreaterThanOrEqual(10);
    }
  });
});
