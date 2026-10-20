import { useEffect, useRef, useState } from 'react';
import { CAN_CREATE_MAPS } from '@kontinentalist/engine';
import { OFFLINE, useLocalConnection } from './local';
import { navigate, useRoute } from './nav';
import { savedName, useConnection } from './net';
import { Admin } from './screens/Admin';
import { Editor } from './screens/Editor';
import { Game } from './screens/Game';
import { Home } from './screens/Home';
import { Lobby } from './screens/Lobby';

export function App() {
  const [name, setName] = useState(savedName);
  // The build decides once which one runs, so the hook order never changes.
  const conn = OFFLINE ? useLocalConnection(name) : useConnection(name);
  const hash = useRoute();
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
      navigate(`#/room/${room.id}`);
    } else if (prevRoom.current) {
      navigate('#/');
    }
    prevRoom.current = room?.id ?? null;
  }, [room?.id]);

  let screen;
  if (room) screen = room.status === 'lobby' ? <Lobby room={room} conn={conn} /> : <Game room={room} conn={conn} />;
  else if (hash === '#/editor' && conn.role && CAN_CREATE_MAPS[conn.role]) screen = <Editor conn={conn} />;
  else if (hash === '#/admin') screen = <Admin conn={conn} />;
  else screen = <Home conn={conn} name={name} setName={setName} />;

  return (
    <>
      {screen}
      {(conn.error || conn.notice) && (
        <div className={conn.error ? 'toast' : 'toast good'} onClick={conn.clearError}>
          {conn.error ?? conn.notice}
        </div>
      )}
    </>
  );
}
