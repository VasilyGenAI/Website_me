import { pips } from './mapgen';
import {
  COSTS,
  hasResources,
  legalCityVertices,
  legalRoadEdges,
  legalSettlementVertices,
  robberTiles,
  tileInfo,
  tileNumber,
  tileResource,
  topo,
  totalCards,
  tradeRatio,
  victoryPoints,
} from './rules';
import { RESOURCES } from './types';
import type { Action, EdgeId, GameState, Resource, ResourceCounts, TileId, VertexId } from './types';

/**
 * Heuristic bot ("easy/medium" strength). It plays on full information about resource
 * counts, which a human can approximate by card counting the public log.
 */
export function botAction(state: GameState, me: number): Action | null {
  const phase = state.phase;
  if (phase.type === 'ended') return null;

  if (phase.type === 'discard') {
    const need = phase.pending[me];
    return need === undefined ? null : { type: 'discard', resources: chooseDiscard(state, me, need) };
  }
  if (phase.type === 'gold') {
    const owed = phase.pending[me];
    return owed === undefined ? null : { type: 'chooseGold', resources: chooseGold(state, me, Math.min(owed, totalCards(state.bank))) };
  }

  const offer = state.tradeOffer;
  if (offer && offer.from !== me && offer.responses[me] === 'pending') {
    return { type: 'respondTrade', accept: wantsTrade(state, me, offer.give, offer.want, offer.from) };
  }
  if (me !== state.currentPlayer) return null;

  if (offer && offer.from === me) {
    if (Object.values(offer.responses).includes('pending')) return null; // wait for answers
    const partner = Object.entries(offer.responses).find(([, r]) => r === 'accepted');
    return partner ? { type: 'confirmTrade', with: Number(partner[0]) } : { type: 'cancelTrade' };
  }

  switch (phase.type) {
    case 'setup':
      if (phase.step === 'settlement') return { type: 'placeSettlement', vertex: best(legalSettlementVertices(state, me), (v) => vertexValue(state, me, v)) };
      return { type: 'placeRoad', edge: bestRoad(state, me) };
    case 'roll':
      if (shouldPlayKnight(state, me)) return { type: 'playKnight' };
      return { type: 'rollDice' };
    case 'robber':
      return { type: 'moveRobber', tile: chooseRobberTile(state, me) };
    case 'steal':
      return { type: 'steal', victim: best(phase.candidates, (p) => victoryPoints(state, p, false) * 10 + totalCards(state.players[p].resources)) };
    case 'roadBuilding':
      return { type: 'placeRoad', edge: bestRoad(state, me) };
    case 'main':
      return mainAction(state, me);
  }
}

function best<T>(items: T[], score: (x: T) => number): T {
  let top = items[0];
  let topScore = -Infinity;
  for (const x of items) {
    const s = score(x);
    if (s > topScore) {
      topScore = s;
      top = x;
    }
  }
  return top;
}

const RESOURCE_WEIGHT: Record<Resource, number> = { lumber: 1.0, brick: 1.0, wool: 0.8, grain: 1.1, ore: 1.1 };

function vertexValue(state: GameState, me: number, v: VertexId): number {
  const t = topo(state);
  const have = new Set<Resource>();
  for (const [vv, b] of Object.entries(state.buildings)) {
    if (b.owner !== me) continue;
    for (const tile of t.vertexTiles[vv]) {
      const r = tileResource(state, tile);
      if (r) have.add(r);
    }
  }
  let score = 0;
  for (const tile of t.vertexTiles[v]) {
    const p = pips(tileNumber(state, tile)) * (tile === state.robber ? 0.3 : 1);
    // A gold field pays any resource, so it is worth more than any single one.
    if (tileInfo(state, tile)?.terrain === 'gold') score += p * 1.35 + 1;
    const r = tileResource(state, tile);
    if (!r) continue;
    score += p * RESOURCE_WEIGHT[r] + (have.has(r) ? 0 : 1.5);
    have.add(r);
  }
  for (const port of state.map.ports) {
    const cs = t.tileVertices[`${port.q},${port.r}`];
    if (cs && (cs[port.side] === v || cs[(port.side + 1) % 6] === v)) score += port.type === 'any' ? 1 : 0.7;
  }
  return score;
}

/** Road that heads towards the best reachable settlement spot (looks two vertices ahead). */
function bestRoad(state: GameState, me: number): EdgeId {
  const t = topo(state);
  const edges = legalRoadEdges(state, me);
  const open = (v: VertexId) => !state.buildings[v] && t.vertexNeighbors[v].every((n) => !state.buildings[n]);
  return best(edges, (e) => {
    let s = 0;
    for (const v of t.edgeVertices[e]) {
      if (state.buildings[v]) continue;
      if (open(v)) s = Math.max(s, vertexValue(state, me, v));
      for (const n of t.vertexNeighbors[v]) if (open(n)) s = Math.max(s, vertexValue(state, me, n) * 0.8);
    }
    return s;
  });
}

function myTiles(state: GameState, me: number): Set<TileId> {
  const t = topo(state);
  const out = new Set<TileId>();
  for (const [v, b] of Object.entries(state.buildings)) if (b.owner === me) t.vertexTiles[v].forEach((x) => out.add(x));
  return out;
}

function hasPlayable(state: GameState, me: number, type: string): boolean {
  return !state.devPlayedThisTurn && state.players[me].devCards.some((c) => c.type === type && c.boughtOnTurn < state.turn);
}

function robberOnMe(state: GameState, me: number): boolean {
  return state.robber !== null && myTiles(state, me).has(state.robber);
}

function shouldPlayKnight(state: GameState, me: number): boolean {
  return hasPlayable(state, me, 'knight') && robberOnMe(state, me);
}

function chooseRobberTile(state: GameState, me: number): TileId {
  const t = topo(state);
  const mine = myTiles(state, me);
  const options = robberTiles(state);
  return best(options, (tile) => {
    let s = mine.has(tile) ? -100 : 0;
    const p = pips(tileNumber(state, tile));
    for (const v of t.tileVertices[tile]) {
      const b = state.buildings[v];
      if (b && b.owner !== me) s += p * (b.type === 'city' ? 2 : 1) * (1 + victoryPoints(state, b.owner, false) / 5);
    }
    return s;
  });
}

/** Gold: take what the current goal still lacks, otherwise what the hand has least of. */
function chooseGold(state: GameState, me: number, count: number): Partial<ResourceCounts> {
  const hand = { ...state.players[me].resources };
  const bank = { ...state.bank };
  const goal = goalCost(state, me) ?? {};
  const out: Partial<ResourceCounts> = {};
  for (let i = 0; i < count; i++) {
    const r = best(
      RESOURCES.filter((x) => bank[x] > 0),
      (x) => ((goal[x] ?? 0) - hand[x]) * 2 - hand[x] * 0.5 + RESOURCE_WEIGHT[x] * 0.1,
    );
    hand[r]++;
    bank[r]--;
    out[r] = (out[r] ?? 0) + 1;
  }
  return out;
}

function chooseDiscard(state: GameState, me: number, count: number): Partial<ResourceCounts> {
  const hand = { ...state.players[me].resources };
  const keep = goalCost(state, me) ?? {};
  const out: Partial<ResourceCounts> = {};
  for (let i = 0; i < count; i++) {
    const r = best(
      RESOURCES.filter((x) => hand[x] > 0),
      (x) => hand[x] - (keep[x] ?? 0) * 1.5,
    );
    hand[r]--;
    out[r] = (out[r] ?? 0) + 1;
  }
  return out;
}

/** What the bot is saving for, in priority order. */
function goalCost(state: GameState, me: number): Partial<ResourceCounts> | null {
  const p = state.players[me];
  if (p.citiesLeft > 0 && legalCityVertices(state, me).length > 0) return COSTS.city;
  if (p.settlementsLeft > 0 && legalSettlementVertices(state, me).length > 0) return COSTS.settlement;
  if (p.roadsLeft > 0 && legalRoadEdges(state, me).length > 0 && p.settlementsLeft > 0) return COSTS.road;
  if (state.devDeck.length > 0) return COSTS.devCard;
  return null;
}

function missing(have: ResourceCounts, need: Partial<ResourceCounts>): Partial<ResourceCounts> {
  const out: Partial<ResourceCounts> = {};
  for (const r of RESOURCES) {
    const m = (need[r] ?? 0) - have[r];
    if (m > 0) out[r] = m;
  }
  return out;
}

function mainAction(state: GameState, me: number): Action {
  const p = state.players[me];
  const res = p.resources;

  if (shouldPlayKnight(state, me)) return { type: 'playKnight' };
  if (hasPlayable(state, me, 'roadBuilding') && p.roadsLeft >= 2 && legalRoadEdges(state, me).length > 0) return { type: 'playRoadBuilding' };

  const cities = legalCityVertices(state, me);
  if (p.citiesLeft > 0 && cities.length && hasResources(res, COSTS.city)) {
    return { type: 'placeCity', vertex: best(cities, (v) => vertexValue(state, me, v)) };
  }
  const spots = legalSettlementVertices(state, me);
  if (p.settlementsLeft > 0 && spots.length && hasResources(res, COSTS.settlement)) {
    return { type: 'placeSettlement', vertex: best(spots, (v) => vertexValue(state, me, v)) };
  }

  const goal = goalCost(state, me);
  if (goal) {
    const need = missing(res, goal);
    const needTotal = totalCards(need);

    if (needTotal === 2 && hasPlayable(state, me, 'yearOfPlenty')) {
      const pick = RESOURCES.flatMap((r) => Array<Resource>(need[r] ?? 0).fill(r)) as [Resource, Resource];
      if (hasResources(state.bank, need)) return { type: 'playYearOfPlenty', resources: pick };
    }
    if (needTotal > 0 && hasPlayable(state, me, 'monopoly')) {
      const r = best(RESOURCES.slice(), (x) => state.players.reduce((s, o, i) => s + (i === me ? 0 : o.resources[x]), 0));
      const haul = state.players.reduce((s, o, i) => s + (i === me ? 0 : o.resources[r]), 0);
      if (haul >= 3) return { type: 'playMonopoly', resource: r };
    }

    if (needTotal > 0) {
      // Bank/port trade surplus into what is missing.
      for (const want of RESOURCES) {
        if (!need[want] || state.bank[want] === 0) continue;
        const give = RESOURCES.filter((g) => g !== want).find((g) => res[g] - (goal[g] ?? 0) >= tradeRatio(state, me, g));
        if (give) return { type: 'bankTrade', give, get: want };
      }
      // One offer per turn, for a card someone actually holds; with plenty to spare, pay 2 for 1.
      if (state.tradesThisTurn < 1) {
        const want = RESOURCES.find((r) => need[r] && state.players.some((o, i) => i !== me && o.resources[r] > 0));
        const give = best(
          RESOURCES.filter((g) => res[g] - (goal[g] ?? 0) > 0 && g !== want),
          (g) => res[g] - (goal[g] ?? 0),
        );
        const spare = give ? res[give] - (goal[give] ?? 0) : 0;
        if (want && give && spare > 0) return { type: 'offerTrade', give: { [give]: spare >= 3 ? 2 : 1 }, want: { [want]: 1 } };
      }
    }
  }

  if (p.roadsLeft > 0 && hasResources(res, COSTS.road) && p.settlementsLeft > 0 && spots.length === 0) {
    const roads = legalRoadEdges(state, me);
    if (roads.length) return { type: 'placeRoad', edge: bestRoad(state, me) };
  }
  if (state.devDeck.length > 0 && hasResources(res, COSTS.devCard) && (goal === COSTS.devCard || totalCards(res) > 7)) {
    return { type: 'buyDevCard' };
  }
  if (hasPlayable(state, me, 'knight') && p.knightsPlayed >= 2) return { type: 'playKnight' };
  return { type: 'endTurn' };
}

/**
 * Accepts a trade when it is worth it: cards the bot still needs for its next build count extra
 * on the receiving side, and cards it would have to give away from that build count extra on
 * the paying side. A generous offer (3 for 1) is taken even without an immediate need.
 */
function wantsTrade(state: GameState, me: number, theyGive: Partial<ResourceCounts>, theyWant: Partial<ResourceCounts>, from: number): boolean {
  if (victoryPoints(state, from, false) >= state.victoryPoints - 2) return false; // don't feed the leader
  const res = state.players[me].resources;
  if (!hasResources(res, theyWant)) return false;
  const goal = goalCost(state, me) ?? {};
  const need = missing(res, goal);
  let gain = 0;
  let loss = 0;
  for (const r of RESOURCES) {
    const inN = theyGive[r] ?? 0;
    const outN = theyWant[r] ?? 0;
    const stillNeeded = need[r] ?? 0;
    gain += Math.min(inN, stillNeeded) * 1.6 + Math.max(0, inN - stillNeeded) * 0.9;
    const spare = Math.max(0, res[r] - (goal[r] ?? 0));
    loss += Math.min(outN, spare) * 1 + Math.max(0, outN - spare) * 2;
  }
  return gain >= loss + 0.5;
}

