import { useEffect, useState } from 'react';
import type { Connection } from '../net';

/** Hidden page (#/admin): log in with ADMIN_KEY, then mint Pro codes. */
export function Admin({ conn }: { conn: Connection }) {
  const [key, setKey] = useState('');
  const [count, setCount] = useState(5);
  const [days, setDays] = useState(30);
  const isAdmin = conn.role === 'admin';

  useEffect(() => {
    if (isAdmin) conn.send({ t: 'adminStats' });
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="home">
      <div className="hero">
        <h1>⚙️ Admin</h1>
      </div>
      {!isAdmin ? (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            conn.send({ t: 'adminLogin', key });
            setKey('');
          }}
        >
          <label>
            Admin-Schlüssel
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="current-password" />
          </label>
          <button className="primary" disabled={!key}>Anmelden</button>
        </form>
      ) : (
        <>
          <div className="card">
            <h2>Pro-Codes erzeugen</h2>
            <label>
              Anzahl
              <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </label>
            <label>
              Pro-Laufzeit in Tagen (0 = unbegrenzt)
              <input type="number" min={0} max={3650} value={days} onChange={(e) => setDays(Number(e.target.value))} />
            </label>
            <button className="primary" onClick={() => conn.send({ t: 'adminCreateCodes', count, days })}>Codes erzeugen</button>
            {conn.codes && (
              <>
                <textarea className="codes" readOnly rows={Math.min(conn.codes.codes.length, 10)} value={conn.codes.codes.join('\n')} onFocus={(e) => e.target.select()} />
                <button onClick={() => navigator.clipboard?.writeText(conn.codes!.codes.join('\n'))}>Alle kopieren</button>
                <p className="muted">Jeder Code ist einmal einlösbar und gibt {conn.codes.days === 0 ? 'unbegrenzt' : `${conn.codes.days} Tage`} Pro.</p>
              </>
            )}
          </div>
          <div className="card">
            <h2>Server</h2>
            {conn.stats ? (
              <p>{conn.stats.connections} Verbindungen · {conn.stats.rooms} Räume · {conn.stats.playing} laufende Spiele</p>
            ) : (
              <p className="muted">Lade…</p>
            )}
            <button onClick={() => conn.send({ t: 'adminStats' })}>Aktualisieren</button>
          </div>
        </>
      )}
      <a className="button" href="#/">Zur Startseite</a>
    </div>
  );
}
