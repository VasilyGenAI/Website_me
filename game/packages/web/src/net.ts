import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, Role, RoomView, ServerMessage } from '@kontinentalist/engine';
import { translateError } from './i18n';

function storage(key: string, fallback: () => string): string {
  try {
    const v = localStorage.getItem(key);
    if (v) return v;
    const fresh = fallback();
    localStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return fallback();
  }
}

export const userId = storage('kontinentalist.userId', () =>
  typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `u${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`,
);

export function savedName(): string {
  return storage('kontinentalist.name', () => `Gast${Math.floor(Math.random() * 900 + 100)}`);
}

const TOKEN_KEY = 'kontinentalist.token';

function savedToken(): string | undefined {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem('kontinentalist.name', name);
  } catch {
    /* private mode: name just isn't remembered */
  }
}

export interface Connection {
  connected: boolean;
  role: Role | null;
  room: RoomView | null;
  error: string | null;
  notice: string | null;
  codes: { codes: string[]; days: number } | null;
  stats: { rooms: number; playing: number; connections: number } | null;
  send(msg: ClientMessage): void;
  clearError(): void;
  /** Offline test build only: switch roles to see what each one can do. */
  setTestRole?: (role: Role) => void;
}

/** One WebSocket per tab; reconnects and rejoins the current room automatically. */
export function useConnection(name: string): Connection {
  const ws = useRef<WebSocket | null>(null);
  const roomId = useRef<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [codes, setCodes] = useState<Connection['codes']>(null);
  const [stats, setStats] = useState<Connection['stats']>(null);
  const nameRef = useRef(name);
  nameRef.current = name;

  useEffect(() => {
    let closed = false;
    let retry: ReturnType<typeof setTimeout>;
    const open = () => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const sock = new WebSocket(`${proto}://${location.host}/ws`);
      ws.current = sock;
      sock.onopen = () => {
        setConnected(true);
        sock.send(JSON.stringify({ t: 'hello', userId, name: nameRef.current, token: savedToken() }));
        if (roomId.current) sock.send(JSON.stringify({ t: 'joinRoom', roomId: roomId.current }));
      };
      sock.onmessage = (ev) => {
        const msg = JSON.parse(ev.data) as ServerMessage;
        if (msg.t === 'welcome') setRole(msg.role);
        else if (msg.t === 'token') {
          try {
            localStorage.setItem(TOKEN_KEY, msg.token);
          } catch {
            /* private mode: the role lasts for this tab only */
          }
          setRole(msg.role);
          setNotice(msg.role === 'admin' ? 'Als Admin angemeldet' : 'Pro freigeschaltet!');
        } else if (msg.t === 'codes') setCodes({ codes: msg.codes, days: msg.days });
        else if (msg.t === 'stats') setStats({ rooms: msg.rooms, playing: msg.playing, connections: msg.connections });
        else if (msg.t === 'room') {
          roomId.current = msg.room.id;
          setRoom(msg.room);
        } else if (msg.t === 'left') {
          roomId.current = null;
          setRoom(null);
        } else if (msg.t === 'error') setError(translateError(msg.message));
      };
      sock.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(open, 1500);
      };
    };
    open();
    return () => {
      closed = true;
      clearTimeout(retry);
      ws.current?.close();
    };
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    if (msg.t === 'hello') {
      nameRef.current = msg.name;
      msg = { ...msg, token: savedToken() };
    }
    ws.current?.readyState === WebSocket.OPEN && ws.current.send(JSON.stringify(msg));
  }, []);

  return {
    connected,
    role,
    room,
    error,
    notice,
    codes,
    stats,
    send,
    clearError: () => {
      setError(null);
      setNotice(null);
    },
  };
}
