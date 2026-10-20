import { useState } from 'react';
import { OFFLINE } from '../local';
import { navigate } from '../nav';
import type { Connection } from '../net';

const FEATURES: [string, boolean, boolean][] = [
  ['Gegen Bots und Menschen spielen', true, true],
  ['Vorgefertigte Karten (Klassisch, Deutschland, Ukraine …)', true, true],
  ['Freigegebene Custom-Karten spielen', true, true],
  ['Eigene Karten bauen und testen', false, true],
  ['Eigene Karten veröffentlichen und für alle freigeben', false, true],
];

export function Pro({ conn }: { conn: Connection }) {
  const [code, setCode] = useState('');
  return (
    <div className="page narrow">
      <h2 className="page-title">⭐ Kontinentalist Pro</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th /><th>Basic</th><th>Pro</th></tr>
          </thead>
          <tbody>
            {FEATURES.map(([f, basic, pro]) => (
              <tr key={f}><td>{f}</td><td>{basic ? '✔' : '–'}</td><td>{pro ? '✔' : '–'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {conn.role === 'basic' ? (
        <div className="card">
          <h3>Pro-Code einlösen</h3>
          <form
            className="join"
            onSubmit={(e) => {
              e.preventDefault();
              conn.send({ t: 'redeemCode', code });
              setCode('');
            }}
          >
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="KONT-…" maxLength={40} aria-label="Pro-Code" />
            <button disabled={!code.trim()}>Einlösen</button>
          </form>
          {OFFLINE && <p className="muted small">Codes funktionieren erst in der Online-Version. Zum Testen kannst du unter „Mehr“ die Rolle wechseln.</p>}
        </div>
      ) : (
        <p className="note">Du hast {conn.role === 'admin' ? 'Admin-Rechte' : 'Pro'}. Bezahlen per Karte oder PayPal kommt später.</p>
      )}
      {conn.role === 'admin' && <button onClick={() => navigate('#/admin')}>⚙️ Admin-Bereich: Codes erzeugen</button>}
    </div>
  );
}
