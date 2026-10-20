import type { Action, MapDef } from './types';
import type { GameView } from './view';

export type Role = 'admin' | 'pro' | 'basic';

export type PresetId = 'standard' | 'nebelwald';

export const CAN_CREATE_MAPS: Record<Role, boolean> = { admin: true, pro: true, basic: false };

export interface SeatView {
  id: string;
  name: string;
  color: string;
  isBot: boolean;
  connected: boolean;
}

export interface ChatMessage {
  from: string;
  text: string;
  at: number;
}

export interface RoomView {
  id: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'ended';
  mapName: string;
  seats: SeatView[];
  /** Index of the viewer's seat, or null for spectators. */
  you: number | null;
  game: GameView | null;
  chat: ChatMessage[];
}

export type ClientMessage =
  | { t: 'hello'; userId: string; name: string }
  /** `preset` boards are open to everyone; a custom `map` needs the pro or admin role. */
  | { t: 'createRoom'; preset?: PresetId; map?: MapDef; bots?: number; start?: boolean }
  | { t: 'joinRoom'; roomId: string }
  | { t: 'addBot' }
  | { t: 'removeSeat'; seat: number }
  | { t: 'start' }
  | { t: 'action'; action: Action }
  | { t: 'chat'; text: string }
  | { t: 'leave' };

export type ServerMessage =
  | { t: 'welcome'; userId: string; role: Role }
  | { t: 'room'; room: RoomView }
  | { t: 'left' }
  | { t: 'error'; message: string };

export const PLAYER_COLORS = ['#d64545', '#2f6fdb', '#e8e8e8', '#f08c1a'];
