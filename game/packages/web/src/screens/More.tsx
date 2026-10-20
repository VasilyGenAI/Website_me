import { ROLE_LABEL } from '../components/Shell';
import { OFFLINE } from '../local';
import { saveName, userId } from '../net';
import type { Connection } from '../net';

const RULES: [string, string][] = [
  ['Ziel', 'Wer in seinem Zug 10 Siegpunkte hat, gewinnt. Siedlung 1, Stadt 2, Siegpunktkarte 1, längste Handelsstraße 2 (ab 5 Straßen), größte Rittermacht 2 (ab 3 Rittern).'],
  ['Aufbau', 'Reihum setzt jeder eine Siedlung und eine Straße, dann in umgekehrter Reihenfolge noch einmal. Die zweite Siedlung bringt sofort je einen Rohstoff der angrenzenden Felder. Siedlungen brauchen immer zwei Straßen Abstand.'],
  ['Würfeln', 'Jedes Feld mit der gewürfelten Zahl liefert: Siedlung 1 Rohstoff, Stadt 2. Die Punkte unter der Zahl zeigen, wie oft sie fällt. 6 und 8 (rot) am häufigsten.'],
  ['Die 7', 'Wer mehr als 7 Karten hat, wirft die Hälfte ab (abgerundet). Dann versetzt der Würfelnde den Räuber, das Feld liefert nichts mehr, und er stiehlt eine Karte von einem Nachbarn des Feldes.'],
  ['Bauen', 'Straße: Holz + Lehm. Siedlung: Holz + Lehm + Wolle + Getreide. Stadt: 2 Getreide + 3 Erz. Entwicklungskarte: Wolle + Getreide + Erz. Maximal 15 Straßen, 5 Siedlungen, 4 Städte.'],
  ['Entwicklungskarten', '14 Ritter, 5 Siegpunkte, je 2 Straßenbau, Erfindung, Monopol. Eine pro Zug, nicht im Zug des Kaufs, auch vor dem Würfeln.'],
  ['Handel', 'Mit der Bank 4:1, an einem 3:1-Hafen 3:1, an einem Spezialhafen 2:1 für diesen Rohstoff. Mit Mitspielern frei verhandelbar, aber nicht gleicher gegen gleichen Rohstoff.'],
  ['Nebel', 'Auf manchen Karten liegen Nebelfelder. Wer eine Straße an ihren Rand baut, deckt sie auf und bekommt einen Rohstoff davon.'],
];

export function More({ conn, name, setName }: { conn: Connection; name: string; setName: (n: string) => void }) {
  return (
    <div className="page narrow">
      <div className="card">
        <h3>Profil</h3>
        <label>
          Dein Name
          <input
            id="player-name"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              saveName(name);
              conn.send({ t: 'hello', userId, name });
            }}
          />
        </label>
      </div>
      {OFFLINE && conn.setTestRole && (
        <div className="card">
          <h3>Testversion</h3>
          <p className="muted">Regeln und Bots laufen in deinem Browser, ohne Server. Rolle zum Testen wechseln:</p>
          <div className="row-btns">
            {(['admin', 'pro', 'basic'] as const).map((r) => (
              <button key={r} className={conn.role === r ? 'on' : ''} onClick={() => conn.setTestRole!(r)}>
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="card">
        <h3>Regeln</h3>
        {RULES.map(([title, text]) => (
          <details key={title}>
            <summary>{title}</summary>
            <p>{text}</p>
          </details>
        ))}
      </div>
      <p className="muted small">Kontinentalist · Testversion</p>
    </div>
  );
}
