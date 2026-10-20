import {
  PLAYER_COLORS,
  actingPlayers,
  applyAction,
  botAction,
  createGame,
  generateStandardMap,
  validateMap,
  viewFor,
} from '@kontinentalist/engine';
import type { Action, ChatMessage, GameState, MapDef, RoomView } from '@kontinentalist/engine';

export interface Seat {
  id: string;
  name: string;
  color: string;
  isBot: boolean;
}

export interface Listener {
  userId: string;
  send(room: RoomView): void;
}

const BOT_NAMES = ['Ada', 'Bruno', 'Clara', 'Dmitri', 'Elif', 'Femi'];
const MAX_SEATS = 4;

/** Delay before a bot acts, so humans can follow what happens. */
function botDelay(state: GameState): number {
  if (state.tradeOffer) return 300;
  switch (state.phase.type) {
    case 'discard':
      return 400;
    case 'roll':
      return 900;
    default:
      return 650;
  }
}

export class RoomError extends Error {}

export class Room {
  readonly seats: Seat[] = [];
  readonly listeners = new Set<Listener>();
  readonly chat: ChatMessage[] = [];
  state: GameState | null = null;
  lastActivity = Date.now();
  private botTimer: NodeJS.Timeout | null = null;
  /** Divides bot delays; tests set it high to play instantly. */
  speed = 1;

  constructor(
    readonly id: string,
    readonly hostId: string,
    readonly map: MapDef | null,
  ) {}

  get status(): RoomView['status'] {
    if (!this.state) return 'lobby';
    return this.state.phase.type === 'ended' ? 'ended' : 'playing';
  }

  seatOf(userId: string): number | null {
    const i = this.seats.findIndex((s) => !s.isBot && s.id === userId);
    return i < 0 ? null : i;
  }

  addHuman(userId: string, name: string): number {
    const existing = this.seatOf(userId);
    if (existing !== null) return existing;
    if (this.state) throw new RoomError('The game has already started');
    if (this.seats.length >= MAX_SEATS) throw new RoomError('The room is full');
    this.seats.push({ id: userId, name, color: this.nextColor(), isBot: false });
    return this.seats.length - 1;
  }

  addBot(byUser: string) {
    this.requireHostInLobby(byUser);
    if (this.seats.length >= MAX_SEATS) throw new RoomError('The room is full');
    const used = new Set(this.seats.map((s) => s.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${this.seats.length + 1}`;
    this.seats.push({ id: `bot-${this.id}-${this.seats.length}-${Date.now()}`, name, color: this.nextColor(), isBot: true });
  }

  removeSeat(byUser: string, seat: number) {
    this.requireHostInLobby(byUser);
    if (this.seats[seat]?.id === this.hostId) throw new RoomError('The host cannot be removed');
    this.seats.splice(seat, 1);
  }

  start(byUser: string, seed = Math.floor(Math.random() * 2 ** 31)) {
    this.requireHostInLobby(byUser);
    if (this.seats.length < 2) throw new RoomError('At least two players are needed');
    const map = this.map ?? generateStandardMap(seed);
    this.state = createGame({ seed, map, players: this.seats.map((s) => ({ ...s })) });
    this.scheduleBots();
  }

  act(userId: string, action: Action) {
    if (!this.state) throw new RoomError('The game has not started');
    const seat = this.seatOf(userId);
    if (seat === null) throw new RoomError('You are not playing in this room');
    const res = applyAction(this.state, seat, action);
    if (!res.ok) throw new RoomError(res.error);
    this.state = res.state;
    this.touch();
    this.scheduleBots();
  }

  say(userId: string, text: string) {
    const clean = text.trim().slice(0, 300);
    if (!clean) return;
    const seat = this.seatOf(userId);
    this.chat.push({ from: seat === null ? 'Zuschauer' : this.seats[seat].name, text: clean, at: Date.now() });
    if (this.chat.length > 100) this.chat.shift();
    this.touch();
  }

  view(userId: string): RoomView {
    const you = this.seatOf(userId);
    return {
      id: this.id,
      hostId: this.hostId,
      status: this.status,
      mapName: this.map?.name ?? 'Standard',
      seats: this.seats.map((s) => ({
        ...s,
        connected: s.isBot || [...this.listeners].some((l) => l.userId === s.id),
      })),
      you,
      game: this.state ? viewFor(this.state, you) : null,
      chat: this.chat.slice(-50),
    };
  }

  touch() {
    this.lastActivity = Date.now();
    for (const l of this.listeners) l.send(this.view(l.userId));
  }

  dispose() {
    if (this.botTimer) clearTimeout(this.botTimer);
    this.botTimer = null;
  }

  private scheduleBots() {
    if (this.botTimer || !this.state || this.state.phase.type === 'ended') return;
    const state = this.state;
    const bot = actingPlayers(state).find((p) => state.players[p].isBot && botAction(state, p));
    if (bot === undefined) return;
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      if (!this.state) return;
      const action = botAction(this.state, bot);
      if (action) {
        const res = applyAction(this.state, bot, action);
        if (res.ok) this.state = res.state;
        else console.error(`room ${this.id}: bot ${bot} ${action.type} rejected: ${res.error}`);
      }
      this.touch();
      this.scheduleBots();
    }, botDelay(state) / this.speed);
  }

  private nextColor(): string {
    const used = new Set(this.seats.map((s) => s.color));
    return PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[0];
  }

  private requireHostInLobby(userId: string) {
    if (userId !== this.hostId) throw new RoomError('Only the host can do that');
    if (this.state) throw new RoomError('The game has already started');
  }
}

export class RoomRegistry {
  private rooms = new Map<string, Room>();

  create(hostId: string, map: MapDef | null): Room {
    if (map) {
      const errors = validateMap(map);
      if (errors.length) throw new RoomError(`Invalid map: ${errors.slice(0, 3).join('; ')}`);
    }
    let id: string;
    do id = Math.random().toString(36).slice(2, 8);
    while (this.rooms.has(id));
    const room = new Room(id, hostId, map);
    this.rooms.set(id, room);
    return room;
  }

  get(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  stats(): { rooms: number; playing: number } {
    const all = [...this.rooms.values()];
    return { rooms: all.length, playing: all.filter((r) => r.status === 'playing').length };
  }

  /** Drops rooms nobody has touched for a while. */
  sweep(maxIdleMs: number) {
    const now = Date.now();
    for (const [id, room] of this.rooms) {
      if (room.listeners.size === 0 && now - room.lastActivity > maxIdleMs) {
        room.dispose();
        this.rooms.delete(id);
      }
    }
  }
}
