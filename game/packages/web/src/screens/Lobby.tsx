import type { RoomView } from '@hexlands/engine';
import { userId } from '../net';
import type { Connection } from '../net';

export function Lobby({ room, conn }: { room: RoomView; conn: Connection }) {
  const isHost = room.hostId === userId;
  const link = `${location.origin}${location.pathname}#/room/${room.id}`;
  return (
    <div className="home">
      <div className="card">
        <h2>Raum {room.id}</h2>
        <p className="muted">Spielbrett: {room.mapName}</p>
        <div className="join">
          <input readOnly value={link} onFocus={(e) => e.target.select()} />
          <button onClick={() => navigator.clipboard?.writeText(link)}>Link kopieren</button>
        </div>
        <ul className="seats">
          {room.seats.map((s, i) => (
            <li key={s.id} style={{ borderColor: s.color }}>
              <span className="avatar" style={{ background: s.color }}>{s.isBot ? '🤖' : '🙂'}</span>
              {s.name}
              {s.id === room.hostId && ' 👑'}
              {!s.connected && ' (offline)'}
              {isHost && s.id !== room.hostId && (
                <button className="mini" onClick={() => conn.send({ t: 'removeSeat', seat: i })}>✕</button>
              )}
            </li>
          ))}
        </ul>
        {isHost ? (
          <div className="row-btns">
            <button disabled={room.seats.length >= 4} onClick={() => conn.send({ t: 'addBot' })}>+ Bot</button>
            <button className="primary" disabled={room.seats.length < 2} onClick={() => conn.send({ t: 'start' })}>Spiel starten</button>
          </div>
        ) : (
          <p className="muted">Warte, bis der Gastgeber das Spiel startet…</p>
        )}
        <button className="ghost-btn" onClick={() => conn.send({ t: 'leave' })}>Verlassen</button>
      </div>
    </div>
  );
}
