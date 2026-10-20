import { useCallback, useEffect, useRef, useState } from 'react';
import { PRESET_MAPS, RoomError, RoomRegistry } from '@kontinentalist/engine';
import type { ClientMessage, Listener, MapDef, Role, Room, RoomView } from '@kontinentalist/engine';
import { translateError } from './i18n';
import { userId } from './net';
import type { Connection } from './net';

/**
 * Offline stand-in for the server: rooms, rules and bots run in this browser tab.
 * Used by the test build, so everything can be played against bots without hosting.
 */
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

  useEffect(() => () => room.current?.dispose(), []);

  const leave = () => {
    room.current?.dispose();
    room.current?.listeners.delete(listener.current);
    room.current = null;
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
          const r = registry.current.create(userId, map);
          r.addHuman(userId, nameRef.current);
          for (let i = 0; i < Math.min(msg.bots ?? 0, 3); i++) r.addBot(userId);
          if (msg.start) r.start(userId);
          r.listeners.add(listener.current);
          room.current = r;
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
