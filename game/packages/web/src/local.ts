import { useCallback, useEffect, useRef, useState } from 'react';
import { PRESET_MAPS, Room, RoomError, RoomRegistry } from '@kontinentalist/engine';
import type { ClientMessage, Listener, MapDef, Role, RoomSnapshot, RoomView } from '@kontinentalist/engine';
import { translateError } from './i18n';
import { userId } from './net';
import type { Connection } from './net';

/**
 * Offline stand-in for the server: rooms, rules and bots run in this browser tab.
 * Used by the test build, so everything can be played against bots without hosting.
 */
/** Room carried over from the previous version of the page, if it was updated mid-game. */
let carried: RoomSnapshot | null = null;
let live: Room | null = null;

export function restoreLocal(data: unknown) {
  const snap = (data as { room?: RoomSnapshot } | null)?.room;
  if (snap?.id && snap.seats) carried = snap;
}

export function localSnapshot(): { room: RoomSnapshot | null } {
  return { room: live?.snapshot() ?? null };
}

export function useLocalConnection(name: string): Connection {
  const registry = useRef(new RoomRegistry());
  const room = useRef<Room | null>(null);
  const nameRef = useRef(name);
  nameRef.current = name;
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('pro');
  const roleRef = useRef(role);
  roleRef.current = role;
  const listener = useRef<Listener>({ userId, send: setView });

  useEffect(() => {
    if (carried) {
      try {
        const r = Room.restore(carried);
        registry.current.adopt(r);
        r.listeners.add(listener.current);
        room.current = live = r;
        r.touch();
      } catch {
        /* an incompatible snapshot from an older version: start fresh */
      }
      carried = null;
    }
    return () => room.current?.dispose();
  }, []);

  const leave = () => {
    room.current?.dispose();
    room.current?.listeners.delete(listener.current);
    room.current = live = null;
    setView(null);
  };

  const send = useCallback((msg: ClientMessage) => {
    try {
      switch (msg.t) {
        case 'hello':
          nameRef.current = msg.name;
          return;
        case 'createRoom': {
          if (msg.map && roleRef.current === 'basic') throw new RoomError('Custom boards need a Pro account');
          leave();
          const map: MapDef | null = msg.map ?? (msg.preset && msg.preset !== 'standard' ? PRESET_MAPS[msg.preset]() : null);
          const r = registry.current.create(userId, map, msg.settings);
          r.addHuman(userId, nameRef.current);
          for (let i = 0; i < Math.min(msg.bots ?? 0, 3); i++) r.addBot(userId);
          if (msg.start) r.start(userId);
          r.listeners.add(listener.current);
          room.current = live = r;
          r.touch();
          return;
        }
        case 'leave':
          return leave();
        case 'listRooms':
          return;
        case 'joinRoom':
        case 'redeemCode':
        case 'adminLogin':
        case 'adminCreateCodes':
        case 'adminStats':
          throw new RoomError('In der Offline-Testversion nicht verfügbar');
      }
      const r = room.current;
      if (!r) throw new RoomError('Join a room first');
      switch (msg.t) {
        case 'addBot':
          r.addBot(userId);
          break;
        case 'removeSeat':
          r.removeSeat(userId, msg.seat);
          break;
        case 'settings':
          r.setSettings(userId, msg.settings ?? {});
          break;
        case 'start':
          r.start(userId);
          break;
        case 'action':
          r.act(userId, msg.action);
          return;
        case 'chat':
          r.say(userId, msg.text);
          return;
      }
      r.touch();
    } catch (e) {
      if (e instanceof RoomError) setError(translateError(e.message));
      else throw e;
    }
  }, []);

  return {
    connected: true,
    role,
    setTestRole: setRole,
    room: view,
    error,
    notice: null,
    codes: null,
    stats: null,
    rooms: null,
    send,
    clearError: () => setError(null),
  };
}

export const OFFLINE = import.meta.env.VITE_OFFLINE === '1';
