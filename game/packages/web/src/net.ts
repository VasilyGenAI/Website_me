import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, Role, RoomView, ServerMessage } from '@hexlands/engine';
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

export const userId = storage('hexlands.userId', () => crypto.randomUUID());

export function savedName(): string {
  return storage('hexlands.name', () => `Gast${Math.floor(Math.random() * 900 + 100)}`);
}

export function saveName(name: string) {
  try {
    localStorage.setItem('hexlands.name', name);
  } catch {
    /* private mode: name just isn't remembered */
  }
}

export interface Connection {
  connected: boolean;
  role: Role | null;
  room: RoomView | null;
  error: string | null;
  send(msg: ClientMessage): void;
  clearError(): void;
}

/** One WebSocket per tab; reconnects and rejoins the current room automatically. */
export function useConnection(name: string): Connection {
  const ws = useRef<WebSocket | null>(null);
  const roomId = useRef<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
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
        sock.send(JSON.stringify({ t: 'hello', userId, name: nameRef.current }));
        if (roomId.current) sock.send(JSON.stringify({ t: 'joinRoom', roomId: roomId.current }));
      };
      sock.onmessage = (ev) => {
        const msg = JSON.parse(ev.data) as ServerMessage;
        if (msg.t === 'welcome') setRole(msg.role);
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
    if (msg.t === 'hello') nameRef.current = msg.name;
    ws.current?.readyState === WebSocket.OPEN && ws.current.send(JSON.stringify(msg));
  }, []);

  return { connected, role, room, error, send, clearError: () => setError(null) };
}
