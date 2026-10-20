import { useEffect } from 'react';
import { OFFLINE } from '../local';
import type { Connection } from '../net';

export function Rooms({ conn }: { conn: Connection }) {
  useEffect(() => {
    if (OFFLINE) return;
    conn.send({ t: 'listRooms' });
    const timer = setInterval(() => conn.send({ t: 'listRooms' }), 5000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const rooms = conn.rooms ?? [];
  return (
    <div className="page">
      <h2 className="page-title">Offene Räume</h2>
      {OFFLINE ? (
        <p className="note">Räume anderer Spieler gibt es erst in der Online-Version. Gegen Bots spielst du unter „Spielen“.</p>
      ) : rooms.length === 0 ? (
        <p className="note">Gerade ist kein Raum offen. Erstelle einen unter „Spielen → Mit Menschen“.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Karte</th>
                <th>Spieler</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id}>
                  <td>{r.mapName}</td>
                  <td>{'👤'.repeat(r.seats)}{'◌'.repeat(4 - r.seats)}</td>
                  <td>
                    <button className="mini" onClick={() => conn.send({ t: 'joinRoom', roomId: r.id })}>Beitreten</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
