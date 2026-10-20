import { tileId } from './geometry';
import {
  legalCityVertices,
  legalRoadEdges,
  legalSettlementVertices,
  longestRoadLength,
  robberTiles,
  totalCards,
  tradeRatio,
  victoryPoints,
} from './rules';
import { RESOURCES } from './types';
import type { Building, DevCard, EdgeId, FogTile, GameEvent, GameState, MapDef, Phase, Resource, ResourceCounts, TileId, TradeOffer, VertexId } from './types';

export interface PublicPlayer {
  id: string;
  name: string;
  color: string;
  isBot: boolean;
  resourceCount: number;
  devCardCount: number;
  knightsPlayed: number;
  roadsLeft: number;
  settlementsLeft: number;
  citiesLeft: number;
  /** Points everyone can see (hidden victory point cards excluded until the game ends). */
  points: number;
  roadLength: number;
}

/** What one seat (or a spectator, `me === null`) is allowed to see. */
export interface GameView {
  map: MapDef;
  victoryPoints: number;
  discardLimit: number;
  players: PublicPlayer[];
  phase: Phase;
  currentPlayer: number;
  turn: number;
  buildings: Record<VertexId, Building>;
  roads: Record<EdgeId, number>;
  robber: TileId | null;
  revealed: Record<TileId, FogTile>;
  /** Fog tiles still covered (plus any old-style random pool). */
  fogPoolSize: number;
  bank: ResourceCounts;
  devDeckSize: number;
  devPlayedThisTurn: boolean;
  dice: [number, number] | null;
  /** Most recent roll in the game, with a running count so clients can animate each new one. */
  lastRoll: { dice: [number, number]; player: number; count: number } | null;
  longestRoad: number | null;
  largestArmy: number | null;
  tradeOffer: TradeOffer | null;
  log: GameEvent[];
  me: number | null;
  hand: ResourceCounts | null;
  devCards: DevCard[];
  myPoints: number;
  tradeRatios: Record<Resource, number> | null;
  /** Legal targets for the viewer's next click, so the client can highlight them. */
  hints: { settlements: VertexId[]; roads: EdgeId[]; cities: VertexId[]; robberTiles: TileId[] };
}

function lastRoll(state: GameState): GameView['lastRoll'] {
  let count = 0;
  let last: Extract<GameEvent, { type: 'diceRolled' }> | null = null;
  for (const ev of state.log) {
    if (ev.type !== 'diceRolled') continue;
    count++;
    last = ev;
  }
  return last ? { dice: last.dice, player: last.player, count } : null;
}

/** Clients only need recent history; the full log stays on the server. */
const LOG_TAIL = 150;

function redactEvent(ev: GameEvent, me: number | null, ended: boolean): GameEvent {
  if (ev.type === 'stolen' && !ended && me !== ev.thief && me !== ev.victim) {
    // Everyone sees that a card moved, only the two players involved see which one.
    return { ...ev, resource: 'hidden' as Resource };
  }
  return ev;
}

export function viewFor(state: GameState, me: number | null): GameView {
  const ended = state.phase.type === 'ended';
  const mine = me !== null;
  const myTurn = mine && state.currentPlayer === me;
  const phase = state.phase.type;
  const hints = { settlements: [] as VertexId[], roads: [] as EdgeId[], cities: [] as VertexId[], robberTiles: [] as TileId[] };
  if (myTurn) {
    if (phase === 'setup' && state.phase.type === 'setup') {
      if (state.phase.step === 'settlement') hints.settlements = legalSettlementVertices(state, me);
      else hints.roads = legalRoadEdges(state, me);
    } else if (phase === 'main') {
      hints.settlements = legalSettlementVertices(state, me);
      hints.roads = legalRoadEdges(state, me);
      hints.cities = legalCityVertices(state, me);
    } else if (phase === 'roadBuilding') {
      hints.roads = legalRoadEdges(state, me);
    } else if (phase === 'robber') {
      hints.robberTiles = robberTiles(state);
    }
  }

  // What lies under the fog is secret: hidden tiles go out as plain fog, and the pool only as a count.
  const { fogPool: _secret, ...rest } = state.map;
  const publicMap = {
    ...rest,
    tiles: rest.tiles.map((t) => (t.hidden ? { q: t.q, r: t.r, terrain: 'fog' as const, number: null } : t)),
  };
  return {
    map: publicMap,
    victoryPoints: state.victoryPoints,
    discardLimit: state.discardLimit,
    players: state.players.map((p, i) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      isBot: p.isBot,
      resourceCount: totalCards(p.resources),
      devCardCount: p.devCards.length,
      knightsPlayed: p.knightsPlayed,
      roadsLeft: p.roadsLeft,
      settlementsLeft: p.settlementsLeft,
      citiesLeft: p.citiesLeft,
      points: victoryPoints(state, i, ended),
      roadLength: longestRoadLength(state, i),
    })),
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    turn: state.turn,
    buildings: state.buildings,
    roads: state.roads,
    robber: state.robber,
    revealed: state.revealed,
    fogPoolSize: state.fogPool.length + state.map.tiles.filter((t) => t.hidden && !state.revealed[tileId(t.q, t.r)]).length,
    bank: state.bank,
    devDeckSize: state.devDeck.length,
    devPlayedThisTurn: state.devPlayedThisTurn,
    dice: state.dice,
    lastRoll: lastRoll(state),
    longestRoad: state.longestRoad,
    largestArmy: state.largestArmy,
    tradeOffer: state.tradeOffer,
    log: state.log.slice(-LOG_TAIL).map((e) => redactEvent(e, me, ended)),
    me,
    hand: mine ? { ...state.players[me].resources } : null,
    devCards: mine ? state.players[me].devCards : [],
    myPoints: mine ? victoryPoints(state, me) : 0,
    tradeRatios: mine ? (Object.fromEntries(RESOURCES.map((r) => [r, tradeRatio(state, me, r)])) as Record<Resource, number>) : null,
    hints,
  };
}
