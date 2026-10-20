import { useEffect, useRef, useState } from 'react';
import { CAN_CREATE_MAPS } from '@hexlands/engine';
import { savedName, useConnection } from './net';
import { Editor } from './screens/Editor';
import { Game } from './screens/Game';
import { Home } from './screens/Home';
import { Lobby } from './screens/Lobby';

function useHash() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export function App() {
  const [name, setName] = useState(savedName);
  const conn = useConnection(name);
  const hash = useHash();
  const room = conn.room;

  // Invite links (#/room/abc123) join as soon as the socket is up.
  const linkRoom = hash.match(/^#\/room\/([a-z0-9]+)/)?.[1];
  useEffect(() => {
    if (conn.connected && linkRoom && room?.id !== linkRoom) conn.send({ t: 'joinRoom', roomId: linkRoom });
  }, [conn.connected, linkRoom]);

  // Keep the address bar in sync so a reload or shared link lands in the same room.
  const prevRoom = useRef<string | null>(null);
  useEffect(() => {
    if (room) {
      if (location.hash !== `#/room/${room.id}`) location.hash = `#/room/${room.id}`;
    } else if (prevRoom.current) {
      location.hash = '#/';
    }
    prevRoom.current = room?.id ?? null;
  }, [room?.id]);

  let screen;
  if (room) screen = room.status === 'lobby' ? <Lobby room={room} conn={conn} /> : <Game room={room} conn={conn} />;
  else if (hash === '#/editor' && conn.role && CAN_CREATE_MAPS[conn.role]) screen = <Editor conn={conn} />;
  else screen = <Home conn={conn} name={name} setName={setName} />;

  return (
    <>
      {screen}
      {conn.error && (
        <div className="toast" onClick={conn.clearError}>
          {conn.error}
        </div>
      )}
    </>
  );
}
