import type { Action, MapDef } from './types';
import type { GameView } from './view';

export type Role = 'admin' | 'pro' | 'basic';

export type PresetId = 'standard' | 'deutschland' | 'ukraine' | 'nebelwald';

export const CAN_CREATE_MAPS: Record<Role, boolean> = { admin: true, pro: true, basic: false };

export interface SeatView {
  id: string;
  name: string;
  color: string;
  isBot: boolean;
  connected: boolean;
}

/** A lobby anyone can join, as listed on the rooms screen. */
export interface OpenRoom {
  id: string;
  mapName: string;
  seats: number;
}

export interface ChatMessage {
  from: string;
  text: string;
  at: number;
}

/** Chosen before the game starts, like colonist's advanced settings. */
export interface GameSettings {
  /** Seconds per turn; 0 turns the clock off. */
  turnTimer: number;
  victoryPoints: number;
  /** Players holding more cards than this discard half on a 7. */
  discardLimit: number;
}

export const TURN_TIMERS = [0, 30, 45, 60, 90, 120, 180, 300];
export const DEFAULT_SETTINGS: GameSettings = { turnTimer: 60, victoryPoints: 10, discardLimit: 7 };

/** Fills gaps and clamps whatever a client sent into allowed values. */
export function cleanSettings(s: Partial<GameSettings> = {}): GameSettings {
  const clamp = (v: unknown, lo: number, hi: number, d: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v as number))) : d);
  return {
    turnTimer: TURN_TIMERS.includes(s.turnTimer as number) ? (s.turnTimer as number) : DEFAULT_SETTINGS.turnTimer,
    victoryPoints: clamp(s.victoryPoints, 3, 20, DEFAULT_SETTINGS.victoryPoints),
    discardLimit: clamp(s.discardLimit, 5, 20, DEFAULT_SETTINGS.discardLimit),
  };
}

export interface RoomView {
  id: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'ended';
  mapName: string;
  settings: GameSettings;
  /** Turn clock: milliseconds left and the seats it is waiting for, or null when nobody is timed. */
  clock: { left: number; waiting: number[] } | null;
  seats: SeatView[];
  /** Index of the viewer's seat, or null for spectators. */
  you: number | null;
  game: GameView | null;
  chat: ChatMessage[];
}

export type ClientMessage =
  /** `token` proves a pro/admin role earned earlier (code redeemed or admin login). */
  | { t: 'hello'; userId: string; name: string; token?: string }
  | { t: 'redeemCode'; code: string }
  | { t: 'adminLogin'; key: string }
  | { t: 'adminCreateCodes'; count: number; days: number }
  | { t: 'adminStats' }
  | { t: 'listRooms' }
  /** `preset` boards are open to everyone; a custom `map` needs the pro or admin role. */
  | { t: 'createRoom'; preset?: PresetId; map?: MapDef; bots?: number; start?: boolean; settings?: Partial<GameSettings> }
  | { t: 'joinRoom'; roomId: string }
  | { t: 'addBot' }
  | { t: 'removeSeat'; seat: number }
  | { t: 'settings'; settings: Partial<GameSettings> }
  | { t: 'start' }
  | { t: 'action'; action: Action }
  | { t: 'chat'; text: string }
  | { t: 'leave' };

export type ServerMessage =
  | { t: 'welcome'; userId: string; role: Role }
  /** New role proof for the client to keep. */
  | { t: 'token'; token: string; role: Role }
  | { t: 'codes'; codes: string[]; days: number }
  | { t: 'stats'; rooms: number; playing: number; connections: number }
  | { t: 'rooms'; rooms: OpenRoom[] }
  | { t: 'room'; room: RoomView }
  | { t: 'left' }
  | { t: 'error'; message: string };

export const PLAYER_COLORS = ['#d64545', '#2f6fdb', '#e8e8e8', '#f08c1a'];
