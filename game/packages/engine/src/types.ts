export const RESOURCES = ['lumber', 'brick', 'wool', 'grain', 'ore'] as const;
export type Resource = (typeof RESOURCES)[number];
export type ResourceCounts = Record<Resource, number>;

/** 'fog' is a hidden tile that turns into an entry of the map's fog pool once a road is built along it. */
export type Terrain = 'forest' | 'hills' | 'pasture' | 'fields' | 'mountains' | 'desert' | 'fog';

export const TERRAIN_RESOURCE: Record<Terrain, Resource | null> = {
  forest: 'lumber',
  hills: 'brick',
  pasture: 'wool',
  fields: 'grain',
  mountains: 'ore',
  desert: null,
  fog: null,
};

export type PortType = Resource | 'any';

/** Vertex id: integer lattice point "x,y" (x in units of sqrt(3)/2, y in units of 1/2 hex size). */
export type VertexId = string;
/** Edge id: two vertex ids, sorted, joined with "|". */
export type EdgeId = string;
/** Tile id: axial coordinate "q,r". */
export type TileId = string;

export interface MapTile {
  q: number;
  r: number;
  terrain: Terrain;
  /** Dice number 2..12 (never 7); null for desert and fog. */
  number: number | null;
  /** Optional place name shown on the tile, e.g. a city on a country board. */
  label?: string;
}

export interface MapPort {
  /** Land tile the port is attached to. */
  q: number;
  r: number;
  /** Tile side 0..5; side i joins corner i and corner i+1 (corner 0 = top, clockwise). */
  side: number;
  type: PortType;
}

/** What a fog tile can turn into. */
export interface FogTile {
  terrain: Exclude<Terrain, 'fog'>;
  number: number | null;
}

/**
 * A board. Only land tiles are listed; any hex not listed is water, so lakes and separate
 * islands are simply gaps in the list. Ports can sit on any coastal edge, inner lakes included.
 */
export interface MapDef {
  name: string;
  tiles: MapTile[];
  ports: MapPort[];
  /** Tiles drawn (in random order) when fog is revealed. Needs at least one entry per fog tile. */
  fogPool?: FogTile[];
  /** Whether revealing a fog tile pays one card of its resource to the revealing player (default true). */
  fogReward?: boolean;
}

export type DevCardType = 'knight' | 'roadBuilding' | 'yearOfPlenty' | 'monopoly' | 'victoryPoint';

export interface DevCard {
  type: DevCardType;
  boughtOnTurn: number;
}

export interface PlayerConfig {
  id: string;
  name: string;
  color: string;
  isBot?: boolean;
}

export interface GameConfig {
  seed: number;
  players: PlayerConfig[];
  map?: MapDef;
  victoryPoints?: number;
  /** Players holding more than this many cards discard half on a 7. */
  discardLimit?: number;
}

export interface PlayerState {
  id: string;
  name: string;
  color: string;
  isBot: boolean;
  resources: ResourceCounts;
  devCards: DevCard[];
  knightsPlayed: number;
  roadsLeft: number;
  settlementsLeft: number;
  citiesLeft: number;
}

export interface Building {
  owner: number;
  type: 'settlement' | 'city';
}

/** Phase to return to after an interrupting step (knight / road building can be played before rolling). */
export type ResumePhase = 'roll' | 'main';

export type Phase =
  | { type: 'setup'; step: 'settlement' | 'road'; lastSettlement: VertexId | null }
  | { type: 'roll' }
  | { type: 'discard'; pending: Record<number, number> }
  | { type: 'robber'; then: ResumePhase }
  | { type: 'steal'; tile: TileId; candidates: number[]; then: ResumePhase }
  | { type: 'main' }
  | { type: 'roadBuilding'; remaining: number; then: ResumePhase }
  | { type: 'ended'; winner: number };

export interface TradeOffer {
  from: number;
  give: Partial<ResourceCounts>;
  want: Partial<ResourceCounts>;
  responses: Record<number, 'pending' | 'accepted' | 'declined'>;
}

export type GameEvent =
  | { type: 'settlementPlaced'; player: number; vertex: VertexId }
  | { type: 'roadPlaced'; player: number; edge: EdgeId }
  | { type: 'cityPlaced'; player: number; vertex: VertexId }
  | { type: 'startingResources'; player: number; resources: Partial<ResourceCounts> }
  | { type: 'diceRolled'; player: number; dice: [number, number] }
  | { type: 'produced'; gains: Record<number, Partial<ResourceCounts>> }
  | { type: 'productionBlocked'; resource: Resource }
  | { type: 'discarded'; player: number; resources: Partial<ResourceCounts> }
  | { type: 'robberMoved'; player: number; tile: TileId }
  | { type: 'fogRevealed'; player: number; tile: TileId; revealed: FogTile; reward: Resource | null }
  | { type: 'stolen'; thief: number; victim: number; resource: Resource }
  | { type: 'devCardBought'; player: number }
  | { type: 'devCardPlayed'; player: number; card: DevCardType }
  | { type: 'yearOfPlenty'; player: number; resources: [Resource, Resource] }
  | { type: 'monopoly'; player: number; resource: Resource; total: number }
  | { type: 'bankTrade'; player: number; give: Resource; giveCount: number; get: Resource }
  | { type: 'tradeOffered'; offer: TradeOffer }
  | { type: 'tradeCompleted'; from: number; to: number; give: Partial<ResourceCounts>; want: Partial<ResourceCounts> }
  | { type: 'tradeCancelled'; from: number }
  | { type: 'longestRoad'; player: number | null }
  | { type: 'largestArmy'; player: number }
  | { type: 'turnEnded'; player: number }
  | { type: 'gameWon'; player: number; points: number };

export interface GameState {
  map: MapDef;
  victoryPoints: number;
  discardLimit: number;
  players: PlayerState[];
  phase: Phase;
  currentPlayer: number;
  /** 0 during setup, then increments every time a player ends a turn. */
  turn: number;
  setupIndex: number;
  buildings: Record<VertexId, Building>;
  roads: Record<EdgeId, number>;
  /** Null when the map has no desert: the robber then waits off the board until the first 7. */
  robber: TileId | null;
  /** Fog tiles revealed so far; overrides the map's 'fog' entry for that tile. */
  revealed: Record<TileId, FogTile>;
  /** Remaining fog pool, already shuffled. Secret: the server must not send it to clients. */
  fogPool: FogTile[];
  bank: ResourceCounts;
  devDeck: DevCardType[];
  devPlayedThisTurn: boolean;
  tradesThisTurn: number;
  dice: [number, number] | null;
  longestRoad: number | null;
  largestArmy: number | null;
  tradeOffer: TradeOffer | null;
  /** Mulberry32 RNG state; keeping it in the state makes every game replayable from its seed. */
  rng: number;
  log: GameEvent[];
}

export type Action =
  | { type: 'placeSettlement'; vertex: VertexId }
  | { type: 'placeRoad'; edge: EdgeId }
  | { type: 'placeCity'; vertex: VertexId }
  | { type: 'rollDice' }
  | { type: 'discard'; resources: Partial<ResourceCounts> }
  | { type: 'moveRobber'; tile: TileId }
  | { type: 'steal'; victim: number }
  | { type: 'buyDevCard' }
  | { type: 'playKnight' }
  | { type: 'playRoadBuilding' }
  | { type: 'playYearOfPlenty'; resources: [Resource, Resource] }
  | { type: 'playMonopoly'; resource: Resource }
  | { type: 'bankTrade'; give: Resource; get: Resource }
  | { type: 'offerTrade'; give: Partial<ResourceCounts>; want: Partial<ResourceCounts> }
  | { type: 'respondTrade'; accept: boolean }
  | { type: 'confirmTrade'; with: number }
  | { type: 'cancelTrade' }
  | { type: 'endTurn' };

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: string };
