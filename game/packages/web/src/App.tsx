import { useEffect, useRef, useState } from 'react';
import { CAN_CREATE_MAPS } from '@kontinentalist/engine';
import { Shell } from './components/Shell';
import { countryOf, recordWin } from './campaign/progress';
import { recordGame } from './library';
import { OFFLINE, useLocalConnection } from './local';
import { navigate, useRoute } from './nav';
import { savedName, useConnection } from './net';
import { Admin } from './screens/Admin';
import { Editor } from './screens/Editor';
import { Game } from './screens/Game';
import { Leaderboard } from './screens/Leaderboard';
import { Lobby } from './screens/Lobby';
import { Maps } from './screens/Maps';
import { More } from './screens/More';
import { Play } from './screens/Play';
import { Pro } from './screens/Pro';
import { Rooms } from './screens/Rooms';
import { World } from './screens/World';

export function App() {
  const [name, setName] = useState(savedName);
  // The build decides once which one runs, so the hook order never changes.
  const conn = OFFLINE ? useLocalConnection(name) : useConnection(name);
  const route = useRoute();
  const room = conn.room;

  // Invite links (#/room/abc123) join as soon as the socket is up.
  const linkRoom = route.match(/^#\/room\/([a-z0-9]+)/)?.[1];
  useEffect(() => {
    if (conn.connected && linkRoom && room?.id !== linkRoom) conn.send({ t: 'joinRoom', roomId: linkRoom });
  }, [conn.connected, linkRoom]);

  // Mirror the room in the URL, and return to the screen the game was started from.
  const prevRoom = useRef<string | null>(null);
  const returnTo = useRef('#/');
  useEffect(() => {
    if (room) {
      if (!route.startsWith('#/room/')) returnTo.current = route.startsWith('#/editor') ? '#/maps' : route;
      navigate(`#/room/${room.id}`);
    } else if (prevRoom.current) {
      navigate(returnTo.current);
    }
    prevRoom.current = room?.id ?? null;
  }, [room?.id]);

  // Count each finished game once: history, and the test run for custom boards.
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    const g = room?.game;
    if (!room || !g || g.phase.type !== 'ended' || room.you === null || recorded.current === room.id) return;
    recorded.current = room.id;
    const bots = room.seats.filter((s) => s.isBot).length;
    recordGame(
      { at: Date.now(), map: room.mapName, won: g.phase.winner === room.you, points: g.myPoints, players: room.seats.length, bots },
      bots === room.seats.length - 1,
    );
    // A won country board conquers that country on the campaign map.
    const country = g.phase.winner === room.you ? countryOf(room.mapName, g.map.tiles.length) : null;
    if (country) recordWin(country.id, country.size);
  }, [room?.game?.phase.type]);

  const canMaps = conn.role !== null && CAN_CREATE_MAPS[conn.role];
  let screen;
  if (room) screen = room.status === 'lobby' ? <Lobby room={room} conn={conn} /> : <Game room={room} conn={conn} />;
  else if (route.startsWith('#/editor') && canMaps) screen = <Editor key={route} conn={conn} mapId={route.split('/')[2]} />;
  else {
    let page;
    if (route.startsWith('#/rooms')) page = <Rooms conn={conn} />;
    else if (route.startsWith('#/welt')) page = <World conn={conn} />;
    else if (route.startsWith('#/maps')) page = <Maps conn={conn} />;
    else if (route.startsWith('#/leaderboard')) page = <Leaderboard />;
    else if (route.startsWith('#/pro')) page = <Pro conn={conn} />;
    else if (route.startsWith('#/more')) page = <More conn={conn} name={name} setName={setName} />;
    else if (route.startsWith('#/admin')) page = <Admin conn={conn} />;
    else page = <Play conn={conn} />;
    screen = <Shell conn={conn} name={name}>{page}</Shell>;
  }

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
