import { tileId } from './geometry';
import { generateStandardMap } from './mapgen';
import { randInt, shuffle } from './rng';
import {
  COSTS,
  emptyResources,
  hasResources,
  isVertexOpen,
  legalRoadEdges,
  legalSettlementVertices,
  longestRoadLength,
  robberCandidates,
  robberTiles,
  mapTile,
  tileInfo,
  tileNumber,
  tileResource,
  topo,
  totalCards,
  tradeRatio,
  victoryPoints,
} from './rules';
import { RESOURCES, TERRAIN_RESOURCE } from './types';
import type {
  Action,
  ActionResult,
  DevCardType,
  GameConfig,
  GameEvent,
  GameState,
  Resource,
  ResourceCounts,
  ResumePhase,
} from './types';

const DEV_DECK: DevCardType[] = [
  ...Array<DevCardType>(14).fill('knight'),
  ...Array<DevCardType>(5).fill('victoryPoint'),
  'roadBuilding',
  'roadBuilding',
  'yearOfPlenty',
  'yearOfPlenty',
  'monopoly',
  'monopoly',
];

const BANK_SIZE = 19;

export function createGame(config: GameConfig): GameState {
  const n = config.players.length;
  if (n < 2 || n > 4) throw new Error('The standard game supports 2-4 players');
  const map = config.map ?? generateStandardMap(config.seed);
  const desert = map.tiles.find((t) => t.terrain === 'desert' && !t.hidden);
  const rng = { rng: config.seed ^ 0x5bd1e995 };
  const fogPool = shuffle(rng, map.fogPool ?? []);
  return {
    map,
    victoryPoints: config.victoryPoints ?? 10,
    discardLimit: config.discardLimit ?? 7,
    players: config.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      isBot: p.isBot ?? false,
      resources: emptyResources(),
      devCards: [],
      knightsPlayed: 0,
      roadsLeft: 15,
      settlementsLeft: 5,
      citiesLeft: 4,
    })),
    phase: { type: 'setup', step: 'settlement', lastSettlement: null },
    currentPlayer: 0,
    turn: 0,
    setupIndex: 0,
    buildings: {},
    roads: {},
    robber: desert ? tileId(desert.q, desert.r) : null,
    revealed: {},
    fogPool,
    bank: { lumber: BANK_SIZE, brick: BANK_SIZE, wool: BANK_SIZE, grain: BANK_SIZE, ore: BANK_SIZE },
    devDeck: shuffle(rng, DEV_DECK),
    devPlayedThisTurn: false,
    tradesThisTurn: 0,
    dice: null,
    longestRoad: null,
    largestArmy: null,
    tradeOffer: null,
    rng: rng.rng,
    log: [],
  };
}

/** Snake order for the opening: 0,1,2,3,3,2,1,0. */
function setupPlayer(n: number, index: number): number {
  return index < n ? index : 2 * n - 1 - index;
}

class RuleError extends Error {}
function check(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new RuleError(msg);
}

/** Applies an action for `player`. Never mutates the input state. */
export function applyAction(input: GameState, player: number, action: Action): ActionResult {
  // The map and past log entries never change, so they are shared instead of deep-cloned.
  const state: GameState = { ...structuredClone({ ...input, map: undefined, log: undefined }), map: input.map, log: input.log.slice() };
  try {
    reduce(state, player, action);
  } catch (e) {
    if (e instanceof RuleError) return { ok: false, error: e.message };
    throw e;
  }
  checkWinner(state);
  return { ok: true, state };
}

function emit(state: GameState, ev: GameEvent) {
  state.log.push(ev);
}

function pay(state: GameState, player: number, cost: Partial<ResourceCounts>) {
  const p = state.players[player];
  for (const r of RESOURCES) {
    const n = cost[r] ?? 0;
    p.resources[r] -= n;
    state.bank[r] += n;
  }
}

function giveFromBank(state: GameState, player: number, gains: Partial<ResourceCounts>) {
  const p = state.players[player];
  for (const r of RESOURCES) {
    const n = gains[r] ?? 0;
    p.resources[r] += n;
    state.bank[r] -= n;
  }
}

function sanitizeCounts(r: Partial<ResourceCounts>): Partial<ResourceCounts> {
  const out: Partial<ResourceCounts> = {};
  for (const k of RESOURCES) {
    const n = r[k] ?? 0;
    check(Number.isInteger(n) && n >= 0, 'Resource amounts must be whole, non-negative numbers');
    if (n > 0) out[k] = n;
  }
  return out;
}

function reduce(state: GameState, player: number, action: Action) {
  const phase = state.phase;
  check(phase.type !== 'ended', 'The game is over');

  // Actions that are not tied to the current player.
  if (action.type === 'discard') return discard(state, player, action.resources);
  if (action.type === 'respondTrade') return respondTrade(state, player, action.accept);

  check(player === state.currentPlayer, 'It is not your turn');
  check(phase.type !== 'discard', 'Waiting for players to discard');

  switch (action.type) {
    case 'placeSettlement':
      return placeSettlement(state, player, action.vertex);
    case 'placeRoad':
      return placeRoad(state, player, action.edge);
    case 'placeCity':
      return placeCity(state, player, action.vertex);
    case 'rollDice':
      return rollDice(state, player);
    case 'moveRobber':
      return moveRobber(state, player, action.tile);
    case 'steal':
      return steal(state, player, action.victim);
    case 'buyDevCard':
      return buyDevCard(state, player);
    case 'playKnight':
    case 'playRoadBuilding':
    case 'playYearOfPlenty':
    case 'playMonopoly':
      return playDevCard(state, player, action);
    case 'bankTrade':
      return bankTrade(state, player, action.give, action.get);
    case 'offerTrade':
      return offerTrade(state, player, action.give, action.want);
    case 'confirmTrade':
      return confirmTrade(state, player, action.with);
    case 'cancelTrade':
      check(state.tradeOffer, 'There is no open trade');
      state.tradeOffer = null;
      emit(state, { type: 'tradeCancelled', from: player });
      return;
    case 'endTurn':
      return endTurn(state, player);
  }
}

function placeSettlement(state: GameState, player: number, vertex: string) {
  const phase = state.phase;
  const p = state.players[player];
  check(p.settlementsLeft > 0, 'No settlements left');
  if (phase.type === 'setup') {
    check(phase.step === 'settlement', 'Place a road first');
    check(isVertexOpen(state, vertex), 'Settlements must be at least two roads apart');
  } else {
    check(phase.type === 'main', 'You cannot build right now');
    check(hasResources(p.resources, COSTS.settlement), 'Not enough resources');
    check(legalSettlementVertices(state, player).includes(vertex), 'Settlements need a free spot connected to your road');
    pay(state, player, COSTS.settlement);
  }
  state.buildings[vertex] = { owner: player, type: 'settlement' };
  p.settlementsLeft--;
  emit(state, { type: 'settlementPlaced', player, vertex });

  if (phase.type === 'setup') {
    // Second opening settlement pays out its neighbouring tiles.
    if (state.setupIndex >= state.players.length) {
      const gains: Partial<ResourceCounts> = {};
      for (const tile of topo(state).vertexTiles[vertex]) {
        const r = tileResource(state, tile);
        if (r && state.bank[r] > 0) gains[r] = (gains[r] ?? 0) + 1;
      }
      giveFromBank(state, player, gains);
      emit(state, { type: 'startingResources', player, resources: gains });
    }
    state.phase = { type: 'setup', step: 'road', lastSettlement: vertex };
  } else {
    // A new settlement can cut an opponent's road.
    updateLongestRoad(state);
  }
}

function placeRoad(state: GameState, player: number, edge: string) {
  const phase = state.phase;
  const p = state.players[player];
  check(p.roadsLeft > 0, 'No roads left');
  check(topo(state).edgeVertices[edge], 'Unknown edge');
  if (phase.type === 'setup') {
    check(phase.step === 'road', 'Place a settlement first');
  } else if (phase.type === 'main') {
    check(hasResources(p.resources, COSTS.road), 'Not enough resources');
  } else {
    check(phase.type === 'roadBuilding', 'You cannot build right now');
  }
  check(legalRoadEdges(state, player).includes(edge), 'Roads must connect to your road or building');

  if (phase.type === 'main') pay(state, player, COSTS.road);
  state.roads[edge] = player;
  p.roadsLeft--;
  emit(state, { type: 'roadPlaced', player, edge });
  revealFog(state, player, edge);

  if (phase.type === 'setup') {
    state.setupIndex++;
    const n = state.players.length;
    if (state.setupIndex >= 2 * n) {
      state.currentPlayer = 0;
      state.turn = 1;
      state.phase = { type: 'roll' };
    } else {
      state.currentPlayer = setupPlayer(n, state.setupIndex);
      state.phase = { type: 'setup', step: 'settlement', lastSettlement: null };
    }
    return;
  }
  updateLongestRoad(state);
  if (phase.type === 'roadBuilding') {
    const remaining = phase.remaining - 1;
    if (remaining > 0 && p.roadsLeft > 0 && legalRoadEdges(state, player).length > 0) {
      state.phase = { ...phase, remaining };
    } else {
      state.phase = { type: phase.then };
    }
  }
}

/** A road along the side of a fog tile reveals it; the explorer may get one card of what was found. */
function revealFog(state: GameState, player: number, edge: string) {
  const t = topo(state);
  for (const tile of t.tiles) {
    if (tileInfo(state, tile)?.terrain !== 'fog') continue;
    const cs = t.tileVertices[tile];
    const [a, b] = t.edgeVertices[edge];
    if (!cs.includes(a) || !cs.includes(b)) continue;
    // A fogged tile shows what the map maker put under it; old-style fog tiles draw from the pool.
    const under = mapTile(state, tile);
    const found =
      under?.hidden && under.terrain !== 'fog'
        ? { terrain: under.terrain, number: under.number }
        : (state.fogPool.pop() ?? { terrain: 'desert' as const, number: null });
    state.revealed[tile] = found;
    const resource = TERRAIN_RESOURCE[found.terrain];
    const reward = resource && state.map.fogReward !== false && state.bank[resource] > 0 ? resource : null;
    if (reward) giveFromBank(state, player, { [reward]: 1 });
    emit(state, { type: 'fogRevealed', player, tile, revealed: found, reward });
  }
}

function placeCity(state: GameState, player: number, vertex: string) {
  const p = state.players[player];
  check(state.phase.type === 'main', 'You cannot build right now');
  check(p.citiesLeft > 0, 'No cities left');
  const b = state.buildings[vertex];
  check(b && b.owner === player && b.type === 'settlement', 'Cities replace one of your settlements');
  check(hasResources(p.resources, COSTS.city), 'Not enough resources');
  pay(state, player, COSTS.city);
  state.buildings[vertex] = { owner: player, type: 'city' };
  p.citiesLeft--;
  p.settlementsLeft++;
  emit(state, { type: 'cityPlaced', player, vertex });
}

function rollDice(state: GameState, player: number) {
  check(state.phase.type === 'roll', 'You already rolled');
  const dice: [number, number] = [randInt(state, 6) + 1, randInt(state, 6) + 1];
  state.dice = dice;
  emit(state, { type: 'diceRolled', player, dice });
  const sum = dice[0] + dice[1];

  if (sum === 7) {
    const pending: Record<number, number> = {};
    state.players.forEach((p, i) => {
      const n = totalCards(p.resources);
      if (n > state.discardLimit) pending[i] = Math.floor(n / 2);
    });
    state.phase = Object.keys(pending).length ? { type: 'discard', pending } : { type: 'robber', then: 'main' };
    return;
  }

  produce(state, sum);
  state.phase = { type: 'main' };
}

function produce(state: GameState, sum: number) {
  const t = topo(state);
  const owed: Record<number, ResourceCounts> = {};
  for (const tile of t.tiles) {
    if (tile === state.robber || tileNumber(state, tile) !== sum) continue;
    const r = tileResource(state, tile);
    if (!r) continue;
    for (const v of t.tileVertices[tile]) {
      const b = state.buildings[v];
      if (!b) continue;
      (owed[b.owner] ??= emptyResources())[r] += b.type === 'city' ? 2 : 1;
    }
  }

  // If the bank cannot pay everyone, nobody gets that resource - unless only one player is owed it.
  const gains: Record<number, Partial<ResourceCounts>> = {};
  for (const r of RESOURCES) {
    const owners = Object.keys(owed).map(Number).filter((p) => owed[p][r] > 0);
    const total = owners.reduce((s, p) => s + owed[p][r], 0);
    if (total === 0) continue;
    if (total <= state.bank[r]) {
      for (const p of owners) (gains[p] ??= {})[r] = owed[p][r];
    } else if (owners.length === 1 && state.bank[r] > 0) {
      (gains[owners[0]] ??= {})[r] = state.bank[r];
    } else {
      emit(state, { type: 'productionBlocked', resource: r });
    }
  }
  for (const [p, g] of Object.entries(gains)) giveFromBank(state, Number(p), g);
  if (Object.keys(gains).length) emit(state, { type: 'produced', gains });
}

function discard(state: GameState, player: number, resources: Partial<ResourceCounts>) {
  const phase = state.phase;
  check(phase.type === 'discard', 'Nobody needs to discard');
  const need = phase.pending[player];
  check(need !== undefined, 'You do not need to discard');
  const r = sanitizeCounts(resources);
  check(totalCards(r) === need, `Discard exactly ${need} cards`);
  check(hasResources(state.players[player].resources, r), 'You do not have those cards');
  pay(state, player, r);
  emit(state, { type: 'discarded', player, resources: r });
  delete phase.pending[player];
  if (Object.keys(phase.pending).length === 0) state.phase = { type: 'robber', then: 'main' };
}

function moveRobber(state: GameState, player: number, tile: string) {
  const phase = state.phase;
  check(phase.type === 'robber', 'You cannot move the robber now');
  check(topo(state).tileVertices[tile], 'Unknown tile');
  check(tile !== state.robber, 'The robber must move to a different tile');
  check(robberTiles(state).includes(tile), 'The robber cannot go into the fog');
  state.robber = tile;
  emit(state, { type: 'robberMoved', player, tile });
  const candidates = robberCandidates(state, tile, player);
  if (candidates.length === 0) {
    state.phase = { type: phase.then };
  } else if (candidates.length === 1) {
    takeRandomCard(state, player, candidates[0]);
    state.phase = { type: phase.then };
  } else {
    state.phase = { type: 'steal', tile, candidates, then: phase.then };
  }
}

function steal(state: GameState, player: number, victim: number) {
  const phase = state.phase;
  check(phase.type === 'steal', 'Nothing to steal right now');
  check(phase.candidates.includes(victim), 'You cannot steal from that player');
  takeRandomCard(state, player, victim);
  state.phase = { type: phase.then };
}

function takeRandomCard(state: GameState, thief: number, victim: number) {
  const hand = state.players[victim].resources;
  const cards = RESOURCES.flatMap((r) => Array<Resource>(hand[r]).fill(r));
  if (cards.length === 0) return;
  const resource = cards[randInt(state, cards.length)];
  hand[resource]--;
  state.players[thief].resources[resource]++;
  emit(state, { type: 'stolen', thief, victim, resource });
}

function buyDevCard(state: GameState, player: number) {
  const p = state.players[player];
  check(state.phase.type === 'main', 'Roll the dice first');
  check(state.devDeck.length > 0, 'No development cards left');
  check(hasResources(p.resources, COSTS.devCard), 'Not enough resources');
  pay(state, player, COSTS.devCard);
  p.devCards.push({ type: state.devDeck.pop()!, boughtOnTurn: state.turn });
  emit(state, { type: 'devCardBought', player });
}

type DevAction = Extract<Action, { type: 'playKnight' | 'playRoadBuilding' | 'playYearOfPlenty' | 'playMonopoly' }>;

const DEV_ACTION_CARD: Record<DevAction['type'], DevCardType> = {
  playKnight: 'knight',
  playRoadBuilding: 'roadBuilding',
  playYearOfPlenty: 'yearOfPlenty',
  playMonopoly: 'monopoly',
};

function playDevCard(state: GameState, player: number, action: DevAction) {
  const phase = state.phase;
  check(phase.type === 'roll' || phase.type === 'main', 'You cannot play a card right now');
  check(!state.devPlayedThisTurn, 'Only one development card per turn');
  const p = state.players[player];
  const type = DEV_ACTION_CARD[action.type];
  const idx = p.devCards.findIndex((c) => c.type === type && c.boughtOnTurn < state.turn);
  check(idx >= 0, 'You have no playable card of that type (cards bought this turn must wait)');
  const then: ResumePhase = phase.type;

  if (action.type === 'playYearOfPlenty') {
    const want: Partial<ResourceCounts> = {};
    for (const r of action.resources) {
      check(RESOURCES.includes(r), 'Unknown resource');
      want[r] = (want[r] ?? 0) + 1;
    }
    check(hasResources(state.bank, want), 'The bank does not have those resources');
  }
  if (action.type === 'playMonopoly') check(RESOURCES.includes(action.resource), 'Unknown resource');

  p.devCards.splice(idx, 1);
  state.devPlayedThisTurn = true;
  emit(state, { type: 'devCardPlayed', player, card: type });

  switch (action.type) {
    case 'playKnight':
      p.knightsPlayed++;
      if (p.knightsPlayed >= 3 && (state.largestArmy === null || p.knightsPlayed > state.players[state.largestArmy].knightsPlayed)) {
        if (state.largestArmy !== player) {
          state.largestArmy = player;
          emit(state, { type: 'largestArmy', player });
        }
      }
      state.phase = { type: 'robber', then };
      return;
    case 'playRoadBuilding': {
      const remaining = Math.min(2, p.roadsLeft);
      if (remaining > 0 && legalRoadEdges(state, player).length > 0) state.phase = { type: 'roadBuilding', remaining, then };
      return;
    }
    case 'playYearOfPlenty': {
      const gains: Partial<ResourceCounts> = {};
      for (const r of action.resources) gains[r] = (gains[r] ?? 0) + 1;
      giveFromBank(state, player, gains);
      emit(state, { type: 'yearOfPlenty', player, resources: action.resources });
      return;
    }
    case 'playMonopoly': {
      let total = 0;
      state.players.forEach((o, i) => {
        if (i === player) return;
        total += o.resources[action.resource];
        o.resources[action.resource] = 0;
      });
      p.resources[action.resource] += total;
      emit(state, { type: 'monopoly', player, resource: action.resource, total });
      return;
    }
  }
}

function bankTrade(state: GameState, player: number, give: Resource, get: Resource) {
  check(state.phase.type === 'main', 'Roll the dice first');
  check(RESOURCES.includes(give) && RESOURCES.includes(get), 'Unknown resource');
  check(give !== get, 'Pick two different resources');
  const ratio = tradeRatio(state, player, give);
  check(state.players[player].resources[give] >= ratio, `You need ${ratio} ${give}`);
  check(state.bank[get] > 0, 'The bank is out of that resource');
  pay(state, player, { [give]: ratio });
  giveFromBank(state, player, { [get]: 1 });
  emit(state, { type: 'bankTrade', player, give, giveCount: ratio, get });
}

const MAX_OFFERS_PER_TURN = 10;

function offerTrade(state: GameState, player: number, giveIn: Partial<ResourceCounts>, wantIn: Partial<ResourceCounts>) {
  check(state.phase.type === 'main', 'Roll the dice first');
  check(!state.tradeOffer, 'Finish your open trade first');
  check(state.tradesThisTurn < MAX_OFFERS_PER_TURN, 'Too many trade offers this turn');
  const give = sanitizeCounts(giveIn);
  const want = sanitizeCounts(wantIn);
  check(totalCards(give) > 0 && totalCards(want) > 0, 'A trade needs cards on both sides');
  check(RESOURCES.every((r) => !(give[r] && want[r])), 'You cannot trade a resource for the same resource');
  check(hasResources(state.players[player].resources, give), 'You do not have those cards');
  const responses: Record<number, 'pending'> = {};
  state.players.forEach((_, i) => {
    if (i !== player) responses[i] = 'pending';
  });
  state.tradeOffer = { from: player, give, want, responses };
  state.tradesThisTurn++;
  emit(state, { type: 'tradeOffered', offer: structuredClone(state.tradeOffer) });
}

function respondTrade(state: GameState, player: number, accept: boolean) {
  const offer = state.tradeOffer;
  check(offer, 'There is no open trade');
  check(offer.responses[player] !== undefined, 'This trade is not addressed to you');
  if (accept) check(hasResources(state.players[player].resources, offer.want), 'You do not have the requested cards');
  offer.responses[player] = accept ? 'accepted' : 'declined';
}

function confirmTrade(state: GameState, player: number, partner: number) {
  const offer = state.tradeOffer;
  check(offer && offer.from === player, 'You have no open trade');
  check(offer.responses[partner] === 'accepted', 'That player has not accepted');
  const me = state.players[player].resources;
  const them = state.players[partner].resources;
  check(hasResources(me, offer.give) && hasResources(them, offer.want), 'Someone no longer has the cards');
  for (const r of RESOURCES) {
    const g = offer.give[r] ?? 0;
    const w = offer.want[r] ?? 0;
    me[r] += w - g;
    them[r] += g - w;
  }
  state.tradeOffer = null;
  emit(state, { type: 'tradeCompleted', from: player, to: partner, give: offer.give, want: offer.want });
}

function endTurn(state: GameState, player: number) {
  check(state.phase.type === 'main', 'Roll the dice before ending your turn');
  state.tradeOffer = null;
  state.devPlayedThisTurn = false;
  state.tradesThisTurn = 0;
  state.dice = null;
  emit(state, { type: 'turnEnded', player });
  state.currentPlayer = (player + 1) % state.players.length;
  state.turn++;
  state.phase = { type: 'roll' };
}

function updateLongestRoad(state: GameState) {
  const lengths = state.players.map((_, i) => longestRoadLength(state, i));
  const max = Math.max(...lengths);
  const holder = state.longestRoad;
  let next: number | null;
  if (holder !== null && lengths[holder] === max && max >= 5) {
    next = holder; // ties keep the current holder
  } else if (max < 5) {
    next = null;
  } else {
    const leaders = lengths.flatMap((l, i) => (l === max ? [i] : []));
    next = leaders.length === 1 ? leaders[0] : null; // a tie after a broken road leaves it unclaimed
  }
  if (next !== holder) {
    state.longestRoad = next;
    emit(state, { type: 'longestRoad', player: next });
  }
}

/** Only the player whose turn it is can win, as in the official rules. */
function checkWinner(state: GameState) {
  if (state.phase.type === 'ended' || state.phase.type === 'setup') return;
  const p = state.currentPlayer;
  const points = victoryPoints(state, p);
  if (points >= state.victoryPoints) {
    state.phase = { type: 'ended', winner: p };
    state.tradeOffer = null;
    emit(state, { type: 'gameWon', player: p, points });
  }
}
